import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, answers } = await req.json();
    
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    // Verify course exists, is published, and is in the same organization
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        published: true,
        organizationId: true,
        creatorId: true,
        title: true,
        joinQuestions: true,
      }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (!course.published) {
      return NextResponse.json({ error: "Course is not published" }, { status: 400 });
    }

    // Verify the student belongs to the same organization as the course
    const studentMembership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organizationId: course.organizationId }
    });
    if (!studentMembership) {
      return NextResponse.json({ error: "Course not available in your organization" }, { status: 403 });
    }

    // Check existing enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId,
        }
      }
    });

    // Grade MCQ answers if configured
    let joinScore: number | null = null;
    let joinTotalQuestions: number | null = null;
    let joinAnswersJson: any = null;

    if (course.joinQuestions && Array.isArray(course.joinQuestions) && course.joinQuestions.length > 0) {
      joinTotalQuestions = course.joinQuestions.length;
      joinAnswersJson = answers || {};
      let correct = 0;
      for (const q of course.joinQuestions as any[]) {
        const questionId = q.id;
        const studentAns = joinAnswersJson[questionId];
        if (studentAns !== undefined && Number(studentAns) === Number(q.correctOption)) {
          correct++;
        }
      }
      joinScore = correct;

      const passed = correct >= Math.ceil(joinTotalQuestions / 2);
      if (!passed) {
        return NextResponse.json({ error: "You must pass the screening quiz (score at least 50%) to request to join." }, { status: 400 });
      }
    }

    if (existingEnrollment) {
      if (existingEnrollment.status === "ACTIVE") {
        return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
      }
      
      if (existingEnrollment.status === "PENDING") {
        return NextResponse.json({ error: "Request already pending" }, { status: 400 });
      }

      // If REJECTED, update to PENDING
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: { 
          status: "PENDING", 
          enrolledAt: new Date(),
          joinAnswers: joinAnswersJson,
          joinScore,
          joinTotalQuestions,
        }
      });
    } else {
      // Create new enrollment with PENDING status
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: courseId,
          status: "PENDING",
          joinAnswers: joinAnswersJson,
          joinScore,
          joinTotalQuestions,
        }
      });
    }

    // Create notification for instructor
    await prisma.notification.create({
      data: {
        userId: course.creatorId,
        message: `${user.name || "A student"} has requested to join ${course.title}`,
        type: "COURSE",
        link: `/instructor/courses/${courseId}?tab=students`,
      }
    });

    return NextResponse.json({
      success: true,
      status: "PENDING",
      message: "Enrollment request submitted successfully"
    });
  } catch (error) {
    console.error("[POST /api/student/enroll] Error:", error);
    return NextResponse.json({ error: "Failed to submit enrollment request" }, { status: 500 });
  }
}
