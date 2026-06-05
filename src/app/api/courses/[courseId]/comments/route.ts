import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const comments = await prisma.courseComment.findMany({
      where: {
        courseId,
        parentId: null, // Only fetch top-level comments
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET Comments Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const body = await request.json();
    const { content, parentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const newComment = await prisma.courseComment.create({
      data: {
        content: content.trim(),
        courseId,
        authorId: userId,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify the instructor of the course if comment is by student/another user
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { creatorId: true, title: true }
      });
      if (course && course.creatorId !== userId) {
        const studentName = newComment.author.name || "A student";
        const message = `${studentName} posted a comment/question on your course "${course.title}"`;
        
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          userId: course.creatorId,
          message,
          type: "STUDENT_QUESTION",
          link: `/instructor/courses/${courseId}`
        });
      }
    } catch (notifErr) {
      console.error("[POST /api/courses/[courseId]/comments] Notification trigger error:", notifErr);
    }

    return NextResponse.json({ comment: newComment });
  } catch (error) {
    console.error("POST Comment Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
