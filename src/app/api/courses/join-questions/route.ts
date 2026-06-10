import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

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

    // Return questions with correctOption hidden (to prevent cheating)
    const questions = Array.isArray(course.joinQuestions)
      ? (course.joinQuestions as any[]).map((q: any) => ({
          id: q.id,
          text: q.text,
          options: q.options,
        }))
      : [];

    return NextResponse.json({ questions });
  } catch (e) {
    console.error("[GET /api/courses/join-questions] Error:", e);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
