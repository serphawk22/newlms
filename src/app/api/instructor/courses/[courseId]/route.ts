import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const course = await prisma.course.findFirst({
      where: { id: courseId, creatorId: userId },
    });

    if (!course) {
      return Response.json({ error: "Course not found or unauthorized" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.materialView.deleteMany({
        where: { material: { courseId } },
      }),
      prisma.plagiarismResult.deleteMany({
        where: { submission: { assignment: { courseId } } },
      }),
      prisma.assignmentSubmission.deleteMany({
        where: { assignment: { courseId } },
      }),
      prisma.assignment.deleteMany({ where: { courseId } }),
      prisma.quizSubmission.deleteMany({
        where: { quiz: { courseId } },
      }),
      prisma.question.deleteMany({
        where: { quiz: { courseId } },
      }),
      prisma.quiz.deleteMany({ where: { courseId } }),
      prisma.liveSession.deleteMany({ where: { courseId } }),
      prisma.enrollment.deleteMany({ where: { courseId } }),
      prisma.lesson.deleteMany({
        where: { module: { courseId } },
      }),
      prisma.module.deleteMany({ where: { courseId } }),
      prisma.readingMaterial.deleteMany({ where: { courseId } }),
      prisma.review.deleteMany({ where: { courseId } }),
      prisma.course.delete({ where: { id: courseId } }),
    ]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete course error:", error);
    return Response.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
