import { prisma } from "@/lib/prisma";

export async function logCourseActivity(courseId: string, action: string) {
  try {
    await prisma.courseActivity.create({
      data: {
        courseId,
        action,
      },
    });
  } catch (err) {
    console.error(`[logCourseActivity] Error logging activity "${action}" for course ${courseId}:`, err);
  }
}
