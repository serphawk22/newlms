import { Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageWrapper } from "../_components/page-wrapper";
import { getInstructorOrgContext } from "../_lib";
import { LearningActivitiesTable } from "../_components/learning-activities-table";
import { AccessDenied } from "@/components/AccessDenied";

export const dynamic = "force-dynamic";

export default async function LearningActivitiesPage() {
  const { orgId, role } = await getInstructorOrgContext();
  if (role !== "ADMIN") {
    return (
      <AccessDenied
        title="Admin Access Required"
        description="This section is only available to administrators"
        buttonLabel="Go back"
        buttonHref="/instructor"
      />
    );
  }

  const [courses, materialViews] = await Promise.all([
    prisma.course.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        title: true,
        modules: {
          select: {
            id: true,
            title: true,
            lessons: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.materialView.findMany({
      where: { material: { course: { organizationId: orgId } } },
      select: {
        id: true,
        student: { select: { name: true, email: true } },
        material: { select: { title: true, courseId: true } },
        viewCount: true,
        viewedAt: true,
      },
      orderBy: { viewedAt: "desc" },
    }),
  ]);

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 30);

  const rows = materialViews.map((view) => ({
    id: view.id,
    studentName: view.student.name || view.student.email,
    lessonName: view.material.title,
    status: "Viewed" as const,
    timeSpent: "N/A",
    lastAccessed: view.viewedAt.toLocaleDateString(),
    attempts: view.viewCount,
    courseId: view.material.courseId,
    moduleId: "unknown",
  }));

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Learning Activities</h1>
      </div>

      <LearningActivitiesTable
        rows={rows}
        filters={{
          courses: courses.map((course) => ({ id: course.id, title: course.title })),
          modules: courses.flatMap((course) =>
            course.modules.map((module) => ({ id: module.id, title: module.title, courseId: course.id }))
          ),
          lessons: courses.flatMap((course) =>
            course.modules.flatMap((module) =>
              module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, moduleId: module.id }))
            )
          ),
        }}
        summary={{
          today: materialViews.filter((view) => view.viewedAt.toDateString() === today.toDateString()).length,
          week: materialViews.filter((view) => view.viewedAt >= weekAgo).length,
          month: materialViews.filter((view) => view.viewedAt >= monthAgo).length,
        }}
      />
    </PageWrapper>
  );
}
