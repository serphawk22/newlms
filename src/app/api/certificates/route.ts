import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

// ── GET /api/certificates  →  list student's own certificates ─────────────────
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: import("jose").JWTPayload;
    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.userId as string;

    const certs = await prisma.certificate.findMany({
      where: { studentId: userId },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ certificates: certs });
  } catch (err) {
    console.error("[GET /api/certificates]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ── POST /api/certificates  →  generate certificate for a completed course ─────
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: import("jose").JWTPayload;
    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.userId as string;
    const { courseId } = await req.json();
    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

    // Return existing certificate if already issued
    const existing = await prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } },
      include: { course: { select: { title: true } } },
    });
    if (existing) return NextResponse.json({ certificate: existing });

    // Verify the student has 100% progress
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { course: { select: { title: true } } },
    });

    if (!enrollment || enrollment.progress < 100) {
      return NextResponse.json({ error: "Course not yet completed" }, { status: 400 });
    }

    // Build a unique certificate number: CERT-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const count = await prisma.certificate.count();
    const certNumber = `CERT-${year}-${String(count + 1).padStart(6, "0")}`;
    const verificationToken = `${certNumber}-${Math.random().toString(36).slice(2, 10)}`;

    // Calculate a rough course duration from recorded classes / live sessions
    const [recordedClasses, liveSessions] = await Promise.all([
      prisma.recordedClass.findMany({
        where: { courseId },
        select: { duration: true },
      }),
      prisma.liveSession.findMany({
        where: { courseId },
        select: { scheduledAt: true },
      }),
    ]);

    const totalSecs = recordedClasses.reduce((s, r) => s + (r.duration ?? 0), 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const courseDuration =
      totalSecs > 0
        ? `${hrs}hrs ${mins}min ${secs}sec`
        : `${liveSessions.length > 0 ? liveSessions.length * 1 : 0}hrs 0min 0sec`;

    const certificate = await prisma.certificate.create({
      data: {
        studentId: userId,
        courseId,
        certificateNumber: certNumber,
        verificationToken,
        completionDate: new Date(),
        courseDuration,
      },
      include: { course: { select: { title: true } } },
    });

    return NextResponse.json({ certificate });
  } catch (err) {
    console.error("[POST /api/certificates]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
