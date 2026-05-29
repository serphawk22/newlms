import { SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getInstructorOrgContext } from "../_lib";
import { PageWrapper } from "../_components/page-wrapper";
import { CustomReports } from "../_components/custom-reports";
import { AccessDenied } from "@/components/AccessDenied";

export const dynamic = "force-dynamic";

export default async function CustomReportsPage() {
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

  const [courses, members, enrollments, quizSubs] = await Promise.all([
    prisma.course.findMany({ where: { organizationId: orgId }, select: { id: true, title: true } }),
    prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      select: { id: true, role: true, user: { select: { name: true, email: true } } },
    }),
    prisma.enrollment.findMany({
      where: { course: { organizationId: orgId } },
      select: { id: true, progress: true, course: { select: { title: true } }, user: { select: { name: true, email: true } } },
    }),
    prisma.quizSubmission.findMany({
      where: { quiz: { course: { organizationId: orgId } } },
      select: {
        id: true,
        obtainedMarks: true,
        totalMarks: true,
        student: { select: { name: true, email: true } },
        quiz: { select: { title: true, course: { select: { title: true } } } },
      },
    }),
  ]);

  const rows = [
    ...members.map((member) => ({
      id: `user-${member.id}`,
      columns: {
        type: "user",
        name: member.user.name || member.user.email,
        email: member.user.email,
        role: member.role,
      },
    })),
    ...enrollments.map((enrollment) => ({
      id: `enrollment-${enrollment.id}`,
      columns: {
        type: "enrollment",
        user: enrollment.user.name || enrollment.user.email,
        course: enrollment.course.title,
        status:
          enrollment.progress >= 100
            ? "completed"
            : enrollment.progress > 0
              ? "in_progress"
              : "not_started",
      },
    })),
    ...quizSubs.map((submission) => ({
      id: `quiz-${submission.id}`,
      columns: {
        type: "quiz_result",
        student: submission.student.name || submission.student.email,
        course: submission.quiz.course.title,
        quiz: submission.quiz.title,
        score: `${submission.obtainedMarks}/${submission.totalMarks}`,
      },
    })),
  ];

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-6">
        <SlidersHorizontal className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Custom Reports</h1>
      </div>
      <CustomReports
        courses={courses.map((course) => ({ id: course.id, label: course.title }))}
        rows={rows}
      />
    </PageWrapper>
  );
}
