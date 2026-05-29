import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

/**
 * GET /api/instructor/course-feedback?courseId=
 *
 * Returns all AdminComments for the course (COURSE + STUDENT types).
 * Caller must be: ADMIN in the org, or INSTRUCTOR who created the course.
 */
export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400, headers: { "Cache-Control": "no-cache" } });

  // Authenticate
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-cache" } });

    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    // Verify user has access to this course (admin or instructor)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true, organizationId: true },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404, headers: { "Cache-Control": "no-cache" } });

    const membership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: course.organizationId } },
    });
    if (!membership) {
      return NextResponse.json({
        error: "ACCESS_DENIED",
        message: "You don't have permission to view this"
      }, { status: 403, headers: { "Cache-Control": "no-cache" } });
    }

    const isAdmin      = membership.role === "ADMIN";
    const isInstructor = membership.role === "INSTRUCTOR" && course.creatorId === userId;

    if (!isAdmin && !isInstructor) {
      return NextResponse.json({
        error: "ACCESS_DENIED",
        message: "You don't have permission to view this"
      }, { status: 403, headers: { "Cache-Control": "no-cache" } });
    }

    // Fetch all comments for this course
    const [courseComments, studentComments] = await Promise.all([
      prisma.adminComment.findMany({
        where: { courseId, targetType: "COURSE" },
        include: {
          author:  { select: { id: true, name: true } },
          student: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.adminComment.findMany({
        where: { courseId, targetType: "STUDENT" },
        include: {
          author:  { select: { id: true, name: true } },
          student: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({ courseComments, studentComments }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (err) {
    console.error("[GET /api/instructor/course-feedback]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: { "Cache-Control": "no-cache" } });
  }
}
