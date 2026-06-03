import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getInstructorId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    if (role !== "INSTRUCTOR" && role !== "ADMIN") return null;
    return (payload.userId as string) ?? null;
  } catch {
    return null;
  }
}

interface QuestionPayload {
  text: string;
  options: [string, string, string, string];
  correctOption: number;
}

/**
 * POST /api/quiz/bulk-save-questions
 * Body: { quizId, courseId, questions: QuestionPayload[] }
 */
export async function POST(req: NextRequest) {
  const instructorId = await getInstructorId();
  if (!instructorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { quizId?: string; courseId?: string; questions?: QuestionPayload[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { quizId, questions } = body;

  if (!quizId || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: "quizId and a non-empty questions array are required" },
      { status: 400 }
    );
  }

  // Verify quiz belongs to this instructor
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: { select: { creatorId: true } } },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
  if (quiz.course.creatorId !== instructorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate & sanitise each question
  const valid = questions
    .filter(
      (q) =>
        typeof q.text === "string" &&
        q.text.trim().length > 0 &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctOption === "number"
    )
    .map((q) => ({
      quizId,
      type: "MCQ" as const,
      text: q.text.trim(),
      options: q.options.map((o) => String(o).trim()),
      correctOption: Math.min(3, Math.max(0, Math.floor(q.correctOption))),
      points: 1,
    }));

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid questions provided" }, { status: 400 });
  }

  await prisma.question.createMany({ data: valid });

  return NextResponse.json({ saved: true, count: valid.length });
}
