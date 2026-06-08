import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notifyEnrollmentRequest } from "@/lib/notifications-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await req.json();
    
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    // Verify course exists, is published, and is in the same organization
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          }
        }
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
        data: { status: "PENDING", enrolledAt: new Date() }
      });
    } else {
      // Create new enrollment with PENDING status
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: courseId,
          status: "PENDING",
        }
      });
    }

    notifyEnrollmentRequest({
      courseId,
      courseTitle: course.title,
      studentName: user.name,
      creatorId: course.creatorId,
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
