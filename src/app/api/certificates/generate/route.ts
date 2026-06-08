import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

// POST /api/certificates/generate — auto-generate for a completed course
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

    // Build unique certificate number: CERT-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const count = await prisma.certificate.count();
    const certNumber = `CERT-${year}-${String(count + 1).padStart(6, "0")}`;
    const verificationToken = `${certNumber}-${Math.random().toString(36).slice(2, 10)}`;

    // Calculate course duration from recorded classes
    const recordedClasses = await prisma.recordedClass.findMany({
      where: { courseId },
      select: { duration: true },
    });
    const totalSecs = recordedClasses.reduce((s, r) => s + (r.duration ?? 0), 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const courseDuration = totalSecs > 0
      ? `${hrs}hrs ${mins}min ${secs}sec`
      : "—";

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

    const { triggerCertificateEarnedEmail } = await import("@/lib/email-notifications-helper");
    triggerCertificateEarnedEmail({
      userId,
      courseId,
      certificateNumber: certificate.certificateNumber,
    }).catch((emailErr) => console.error("[certificates/generate email error]", emailErr));

    return NextResponse.json({ certificate });
  } catch (err) {
    console.error("[POST /api/certificates/generate]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
