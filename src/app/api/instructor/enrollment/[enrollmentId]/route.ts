import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await req.json();
    const { enrollmentId } = await params;

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get enrollment with course info
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            creatorId: true,
            organizationId: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    // Verify instructor owns this course
    if (enrollment.course.creatorId !== user.id) {
      return NextResponse.json({ error: "You do not have permission to manage this enrollment" }, { status: 403 });
    }

    // Update enrollment status
    const newStatus = action === "accept" ? "ACTIVE" : "REJECTED";
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: newStatus }
    });

    // Create notification for student
    const notificationMessage = action === "accept"
      ? `Your request to join ${enrollment.course.title} has been accepted!`
      : `Your request to join ${enrollment.course.title} was not accepted.`;

    await prisma.notification.create({
      data: {
        userId: enrollment.userId,
        message: notificationMessage,
        type: "COURSE",
        link: action === "accept" ? `/student/courses/${enrollment.courseId}` : `/student/courses`,
      }
    });

    return NextResponse.json({
      success: true,
      enrollment: updatedEnrollment,
      message: `Enrollment ${action}ed successfully`
    });
  } catch (error) {
    console.error("[PATCH /api/instructor/enrollment] Error:", error);
    return NextResponse.json({ error: "Failed to update enrollment" }, { status: 500 });
  }
}
