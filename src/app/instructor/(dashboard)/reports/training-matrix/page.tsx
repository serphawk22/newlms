import { Grid } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getInstructorOrgContext } from "../_lib";
import { PageWrapper } from "../_components/page-wrapper";
import { TrainingMatrix } from "../_components/training-matrix";
import { AccessDenied } from "@/components/AccessDenied";

export const dynamic = "force-dynamic";

export default async function TrainingMatrixPage() {
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

  const [members, courses, enrollments] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: orgId, role: "STUDENT" },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { id: "desc" },
    }),
    prisma.course.findMany({
      where: { organizationId: orgId },
      select: { id: true, title: true },
      orderBy: { id: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { course: { organizationId: orgId } },
      select: { userId: true, courseId: true, progress: true },
    }),
  ]);

  const students = members.map((member) => {
    const statuses: Record<string, "completed" | "in_progress" | "not_started" | "not_enrolled"> = {};
    for (const course of courses) {
      const enrollment = enrollments.find(
        (item) => item.userId === member.user.id && item.courseId === course.id
      );
      if (!enrollment) {
        statuses[course.id] = "not_enrolled";
      } else if (enrollment.progress >= 100) {
        statuses[course.id] = "completed";
      } else if (enrollment.progress > 0) {
        statuses[course.id] = "in_progress";
      } else {
        statuses[course.id] = "not_started";
      }
    }

    return {
      id: member.user.id,
      name: member.user.name || member.user.email,
      statuses,
    };
  });

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-6">
        <Grid className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Training Matrix</h1>
      </div>
      <TrainingMatrix
        students={students}
        courses={courses.map((course) => ({ id: course.id, title: course.title }))}
      />
    </PageWrapper>
  );
}
