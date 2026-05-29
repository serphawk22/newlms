"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";

async function authorizeRoadmapAction(courseId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role === "ADMIN") return;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { organizationId: true },
  });
  if (!course) throw new Error("Course not found");

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: course.organizationId } },
    select: { role: true },
  });

  if (!membership || (membership.role !== "INSTRUCTOR" && membership.role !== "ADMIN")) {
    throw new Error("Forbidden");
  }
}

// ── ROADMAP PHASES ────────────────────────────────────────────────────────────

export async function createPhase(courseId: string, title: string, description?: string) {
  try {
    await authorizeRoadmapAction(courseId);

    // Get or create CourseRoadmap
    let roadmap = await prisma.courseRoadmap.findUnique({ where: { courseId } });
    if (!roadmap) {
      roadmap = await prisma.courseRoadmap.create({ data: { courseId } });
    }

    const lastPhase = await prisma.roadmapPhase.findFirst({
      where: { roadmapId: roadmap.id },
      orderBy: { order: "desc" },
    });

    const newOrder = lastPhase ? lastPhase.order + 1 : 0;

    await prisma.roadmapPhase.create({
      data: {
        roadmapId: roadmap.id,
        title,
        description,
        order: newOrder,
      },
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePhase(courseId: string, phaseId: string, data: { title?: string; description?: string }) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.roadmapPhase.update({
      where: { id: phaseId },
      data,
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePhase(courseId: string, phaseId: string) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.roadmapPhase.delete({
      where: { id: phaseId },
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── ROADMAP TOPICS ────────────────────────────────────────────────────────────

export async function createTopic(courseId: string, phaseId: string, title: string) {
  try {
    await authorizeRoadmapAction(courseId);

    const lastTopic = await prisma.roadmapTopic.findFirst({
      where: { phaseId },
      orderBy: { order: "desc" },
    });

    const newOrder = lastTopic ? lastTopic.order + 1 : 0;

    await prisma.roadmapTopic.create({
      data: {
        phaseId,
        title,
        order: newOrder,
      },
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTopic(courseId: string, topicId: string, data: { title?: string }) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.roadmapTopic.update({
      where: { id: topicId },
      data,
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTopic(courseId: string, topicId: string) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.roadmapTopic.delete({
      where: { id: topicId },
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── ROADMAP SUBTOPICS ─────────────────────────────────────────────────────────

export async function createSubtopic(courseId: string, topicId: string, title: string) {
  try {
    await authorizeRoadmapAction(courseId);

    const lastSub = await prisma.roadmapSubtopic.findFirst({
      where: { topicId },
      orderBy: { order: "desc" },
    });

    const newOrder = lastSub ? lastSub.order + 1 : 0;

    await prisma.roadmapSubtopic.create({
      data: {
        topicId,
        title,
        order: newOrder,
      },
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSubtopic(courseId: string, subtopicId: string, data: { title?: string }) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.roadmapSubtopic.update({
      where: { id: subtopicId },
      data,
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSubtopic(courseId: string, subtopicId: string) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.roadmapSubtopic.delete({
      where: { id: subtopicId },
    });

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── REORDERING ────────────────────────────────────────────────────────────────

export async function reorderPhases(courseId: string, updateData: { id: string; order: number }[]) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.$transaction(
      updateData.map((item) =>
        prisma.roadmapPhase.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reorderTopics(courseId: string, updateData: { id: string; order: number }[]) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.$transaction(
      updateData.map((item) =>
        prisma.roadmapTopic.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reorderSubtopics(courseId: string, updateData: { id: string; order: number }[]) {
  try {
    await authorizeRoadmapAction(courseId);

    await prisma.$transaction(
      updateData.map((item) =>
        prisma.roadmapSubtopic.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath(`/instructor/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── STUDENT PROGRESS ──────────────────────────────────────────────────────────

export async function toggleSubtopicProgress(courseId: string, subtopicId: string, completed: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    if (completed) {
      // mark completed
      await prisma.studentRoadmapProgress.upsert({
        where: {
          studentId_subtopicId: {
            studentId: user.id,
            subtopicId,
          },
        },
        update: {},
        create: {
          studentId: user.id,
          subtopicId,
        },
      });
    } else {
      // unmark completed
      await prisma.studentRoadmapProgress.deleteMany({
        where: {
          studentId: user.id,
          subtopicId,
        },
      });
    }

    revalidatePath(`/student/courses/${courseId}/roadmap`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
