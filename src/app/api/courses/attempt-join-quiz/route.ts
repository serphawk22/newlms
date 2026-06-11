import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, answers } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { joinQuestions: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const questions = Array.isArray(course.joinQuestions) ? (course.joinQuestions as any[]) : [];
    const totalQuestions = questions.length;

    if (totalQuestions === 0) {
      return NextResponse.json({ score: 0, totalQuestions: 0, passed: true });
    }

    const studentAnswers = answers || {};
    let correct = 0;

    for (const q of questions) {
      const studentAns = studentAnswers[q.id];
      if (studentAns !== undefined && Number(studentAns) === Number(q.correctOption)) {
        correct++;
      }
    }

    // Passing threshold: 50% correct answers
    const passed = correct >= Math.ceil(totalQuestions / 2);

    return NextResponse.json({
      score: correct,
      totalQuestions,
      passed,
    });
  } catch (e) {
    console.error("[POST /api/courses/attempt-join-quiz] Error:", e);
    return NextResponse.json({ error: "Failed to grade quiz" }, { status: 500 });
  }
}
