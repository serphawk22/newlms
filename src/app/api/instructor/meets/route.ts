import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendLiveClassEmail } from "@/lib/mail";
import { notifyEnrolledStudents } from "@/lib/notifications";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getInstructor() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    if (role !== "INSTRUCTOR" && role !== "ADMIN") return null;
    return payload as { userId: string; role: string; organizationId: string };
  } catch {
    return null;
  }
}

// POST /api/instructor/meets  — create a new live session
// Body: { courseId: string, title: string, scheduledAt?: string (ISO) }
export async function POST(req: NextRequest) {
  const instructor = await getInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { courseId, title: titleRaw, scheduledAt: scheduledAtRaw, moduleId } = await req.json();
    const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Please enter a session title" }, { status: 400 });
    }
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // Verify the course belongs to this instructor's org
    const course = await prisma.course.findFirst({
      where: { id: courseId, organizationId: instructor.organizationId },
      include: { creator: { select: { name: true } } },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const scheduledAt = new Date(scheduledAtRaw);
    if (!scheduledAtRaw || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Please select a valid class time" }, { status: 400 });
    }

    const duplicateStart = new Date(scheduledAt.getTime() - 60 * 1000);
    const duplicateEnd = new Date(scheduledAt.getTime() + 60 * 1000);
    const existingSession = await prisma.liveSession.findFirst({
      where: {
        courseId,
        scheduledAt: {
          gte: duplicateStart,
          lte: duplicateEnd,
        },
      },
      select: { id: true },
    });

    if (existingSession) {
      return NextResponse.json({ error: "A class is already scheduled at this time" }, { status: 409 });
    }

    // Generate a short unique roomId
    const roomId = randomBytes(8).toString("hex");

    const session = await prisma.liveSession.create({
      data: { roomId, title, courseId, status: "SCHEDULED", scheduledAt, ...(moduleId ? { moduleId } : {}) },
    });

    // ── Notifications (email + in-app) ─────────────────────────────────────
    // Non-fatal: errors are caught and logged; the 201 response always goes out
    try {
      // Collect student emails: enrolled first, fallback to org members
      let studentEmails: string[] = [];
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: { user: { select: { email: true } } },
      });

      if (enrollments.length > 0) {
        studentEmails = enrollments.map((e) => e.user.email);
      } else {
        const orgMembers = await prisma.organizationMember.findMany({
          where: { organizationId: instructor.organizationId, role: "STUDENT" },
          include: { user: { select: { email: true } } },
        });
        studentEmails = orgMembers.map((m) => m.user.email);
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const joinLink = `${appUrl}/meet/${roomId}`;
      const instructorName = course.creator?.name || "Your Instructor";

      if (studentEmails.length > 0) {
        await sendLiveClassEmail({
          to: studentEmails,
          courseName: course.title,
          sessionTitle: title,
          scheduledAt,
          instructorName,
          joinLink,
        });
        console.log(
          `[POST /api/instructor/meets] Email sent to ${studentEmails.length} student(s) for "${title}"`
        );

        await notifyEnrolledStudents({
          courseId,
          message: `Live class "${title}" scheduled for ${course.title}. Join at: ${joinLink}`,
          type: "LIVE_CLASS",
          link: `/meet/${roomId}`,
        });
      } else {
        console.log("[POST /api/instructor/meets] No students found to notify.");
      }
    } catch (notifErr) {
      console.error("[POST /api/instructor/meets] Notification step failed (non-fatal):", notifErr);
    }
    // ───────────────────────────────────────────────────────────────────────

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/instructor/meets]", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

// GET /api/instructor/meets?courseId=xxx  — list all sessions for a course
export async function GET(req: NextRequest) {
  const instructor = await getInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  try {
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.liveSession.findMany({
        where: { courseId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true, roomId: true, title: true, status: true,
          scheduledAt: true, createdAt: true, recordingUrl: true,
          moduleId: true,
        },
      }),
      prisma.liveSession.count({ where: { courseId } }),
    ]);
    return NextResponse.json({ sessions, total, page, limit, pages: Math.ceil(total / limit) }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[GET /api/instructor/meets]", err);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// DELETE /api/instructor/meets?courseId=xxx&duplicates=true - delete duplicate session times for a course
export async function DELETE(req: NextRequest) {
  const instructor = await getInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const duplicates = searchParams.get("duplicates") === "true";

  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  if (!duplicates) return NextResponse.json({ error: "duplicates=true required" }, { status: 400 });

  try {
    const course = await prisma.course.findFirst({
      where: { id: courseId, organizationId: instructor.organizationId },
      select: { id: true },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const sessions = await prisma.liveSession.findMany({
      where: { courseId },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
      select: { id: true, scheduledAt: true },
    });

    const seen = new Set<number>();
    const duplicateIds: string[] = [];

    for (const session of sessions) {
      const key = session.scheduledAt.getTime();
      if (seen.has(key)) {
        duplicateIds.push(session.id);
      } else {
        seen.add(key);
      }
    }

    if (duplicateIds.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    const result = await prisma.liveSession.deleteMany({ where: { id: { in: duplicateIds } } });
    return NextResponse.json({ deleted: result.count });
  } catch (err) {
    console.error("[DELETE /api/instructor/meets]", err);
    return NextResponse.json({ error: "Failed to delete duplicate sessions" }, { status: 500 });
  }
}

// PATCH /api/instructor/meets  — update session status or recordingUrl
// Body: { sessionId: string, status?: string, recordingUrl?: string }
export async function PATCH(req: NextRequest) {
  const instructor = await getInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sessionId, status, recordingUrl } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const updated = await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        ...(status && { status }),
        ...(recordingUrl && { recordingUrl }),
      },
    });
    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error("[PATCH /api/instructor/meets]", err);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
