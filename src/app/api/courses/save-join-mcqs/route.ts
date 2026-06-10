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

export async function POST(req: NextRequest) {
  const instructorId = await getInstructorId();
  if (!instructorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { courseId, questions } = await req.json();

    if (!courseId || !Array.isArray(questions)) {
      return NextResponse.json({ error: "courseId and questions array are required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (course.creatorId !== instructorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Save questions
    await prisma.course.update({
      where: { id: courseId },
      data: { joinQuestions: questions },
    });

    return NextResponse.json({ success: true, count: questions.length });
  } catch (e) {
    console.error("[save-join-mcqs] Error:", e);
    return NextResponse.json({ error: "Failed to save questions" }, { status: 500 });
  }
}
