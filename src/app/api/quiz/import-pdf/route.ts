import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ParsedQuestion {
  text: string;
  options: [string, string, string, string];
  correctOption: number; // 0-3
}

/**
 * POST /api/quiz/import-pdf
 * FormData: { file: PDF, quizId: string, courseId: string }
 * Returns: { questions: ParsedQuestion[], saved: boolean }
 */
export async function POST(req: NextRequest) {
  const instructorId = await getInstructorId();
  if (!instructorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const quizId = formData.get("quizId") as string | null;
  const courseId = formData.get("courseId") as string | null;
  const saveNow = formData.get("saveNow") === "true";

  if (!file || !quizId || !courseId) {
    return NextResponse.json(
      { error: "file, quizId, and courseId are required" },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  // Verify quiz belongs to instructor's course
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

  // Parse PDF → text
  let pdfText = "";
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    pdfText = data.text?.trim() ?? "";
  } catch (e) {
    console.error("[import-pdf] pdf-parse error:", e);
    return NextResponse.json({ error: "Failed to read PDF content" }, { status: 422 });
  }

  if (pdfText.length < 20) {
    return NextResponse.json(
      { error: "PDF appears to be empty or contains only images. Please use a text-based PDF." },
      { status: 422 }
    );
  }

  // Truncate to ~8000 chars to stay within token budget
  const truncated = pdfText.slice(0, 8000);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
  }

  // Ask OpenAI to extract MCQ questions
  let parsed: ParsedQuestion[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are an expert quiz generator. Given PDF content, extract or generate multiple-choice questions (MCQ).
Rules:
- Return ONLY a valid JSON array, no markdown, no extra text.
- Each object has: "text" (question string), "options" (array of exactly 4 strings), "correctOption" (integer 0-3 index of the correct option).
- Extract as many questions as are clearly present in the text (up to 30 maximum).
- If the text contains ready-made MCQs, extract them exactly.
- If the text is educational content without explicit questions, generate relevant MCQs from it.
- Ensure all 4 options are distinct and plausible.
Example output:
[{"text":"What is 2+2?","options":["3","4","5","6"],"correctOption":1}]`,
        },
        {
          role: "user",
          content: `Extract MCQ questions from the following PDF content:\n\n${truncated}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(cleaned);

    if (!Array.isArray(arr)) throw new Error("Not an array");

    parsed = arr
      .filter(
        (q: unknown) =>
          q &&
          typeof (q as Record<string, unknown>).text === "string" &&
          Array.isArray((q as Record<string, unknown>).options) &&
          (q as ParsedQuestion).options.length === 4 &&
          typeof (q as ParsedQuestion).correctOption === "number"
      )
      .slice(0, 30)
      .map((q: ParsedQuestion) => ({
        text: String(q.text).trim(),
        options: q.options.map((o) => String(o).trim()) as [string, string, string, string],
        correctOption: Math.min(3, Math.max(0, Math.floor(q.correctOption))),
      }));
  } catch (e) {
    console.error("[import-pdf] OpenAI parse error:", e);
    return NextResponse.json(
      { error: "Failed to extract questions from PDF. The content may not contain clear question-answer format." },
      { status: 422 }
    );
  }

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No valid questions could be extracted from the PDF." },
      { status: 422 }
    );
  }

  // If saveNow flag, bulk-create questions and return saved results
  if (saveNow) {
    await prisma.question.createMany({
      data: parsed.map((q) => ({
        quizId,
        type: "MCQ",
        text: q.text,
        options: q.options,
        correctOption: q.correctOption,
        points: 1,
      })),
    });

    return NextResponse.json({ saved: true, count: parsed.length });
  }

  // Otherwise return preview for instructor confirmation
  return NextResponse.json({ questions: parsed, saved: false });
}
