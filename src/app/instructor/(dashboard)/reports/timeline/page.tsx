import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getInstructorOrgContext } from "../_lib";
import { PageWrapper } from "../_components/page-wrapper";
import { TimelineFeed } from "../_components/timeline-feed";
import { AccessDenied } from "@/components/AccessDenied";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function TimelinePage() {
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

  const [enrollments, completions, quizzes] = await Promise.all([
    prisma.enrollment.findMany({
      where: { course: { organizationId: orgId } },
      select: {
        id: true,
        enrolledAt: true,
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
      orderBy: { enrolledAt: "desc" },
      take: 200,
    }),
    prisma.enrollment.findMany({
      where: { course: { organizationId: orgId }, progress: { gte: 100 } },
      select: {
        id: true,
        enrolledAt: true,
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
      orderBy: { enrolledAt: "desc" },
      take: 200,
    }),
    prisma.quizSubmission.findMany({
      where: { quiz: { course: { organizationId: orgId } } },
      select: {
        id: true,
        submittedAt: true,
        student: { select: { name: true, email: true } },
        quiz: { select: { title: true, course: { select: { title: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      take: 200,
    }),
  ]);

  const timelineItems = [
    ...enrollments.map((item) => ({
      id: `enr-${item.id}`,
      type: "enrollments" as const,
      text: `${item.user.name || item.user.email} enrolled in ${item.course.title}`,
      createdAt: item.enrolledAt.toISOString(),
    })),
    ...completions.map((item) => ({
      id: `cmp-${item.id}`,
      type: "completions" as const,
      text: `${item.user.name || item.user.email} completed ${item.course.title}`,
      createdAt: item.enrolledAt.toISOString(),
    })),
    ...quizzes.map((item) => ({
      id: `quiz-${item.id}`,
      type: "quiz_attempts" as const,
      text: `${item.student.name || item.student.email} attempted quiz ${item.quiz.title}`,
      createdAt: item.submittedAt.toISOString(),
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Timeline</h1>
      </div>
      <TimelineFeed items={timelineItems} />
    </PageWrapper>
  );
}
