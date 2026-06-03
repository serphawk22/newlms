import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const { certificateId } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber: certificateId },
      include: {
        student: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json({ valid: false, error: "Certificate Not Found" }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      data: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.student?.name ?? "Student",
        courseName: certificate.course?.title ?? "Course",
        completionDate: certificate.completionDate.toISOString(),
        courseDuration: certificate.courseDuration,
      },
    });
  } catch (err) {
    console.error("Verify Certificate Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
