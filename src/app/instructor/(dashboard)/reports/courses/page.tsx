import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { getInstructorOrgContext } from "../_lib";
import { PageWrapper } from "../_components/page-wrapper";
import { CourseRow, CoursesTable } from "../_components/courses-table";
import { AccessDenied } from "@/components/AccessDenied";

export const dynamic = "force-dynamic";

export default async function CoursesReportPage() {
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

  const [courses, enrollments, quizSubs] = await Promise.all([
    prisma.course.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        title: true,
        published: true,
        enrollments: {
          select: {
            progress: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { course: { organizationId: orgId } },
      select: { progress: true },
    }),
    prisma.quizSubmission.findMany({
      where: { quiz: { course: { organizationId: orgId } } },
      select: { obtainedMarks: true, totalMarks: true, quiz: { select: { courseId: true } } },
    }),
  ]);

  const courseRows: CourseRow[] = courses.map((course) => {
    const enrolled = course.enrollments.length;
    const completed = course.enrollments.filter((enrollment) => enrollment.progress >= 100).length;
    const completionPct = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;
    const scoreRows = quizSubs.filter((submission) => submission.quiz.courseId === course.id);
    const avgScore = scoreRows.length === 0
      ? 0
      : Math.round(
          scoreRows.reduce((sum, submission) => {
            const max = submission.totalMarks || 1;
            return sum + (submission.obtainedMarks / max) * 100;
          }, 0) / scoreRows.length
        );

    return {
      id: course.id,
      name: course.title,
      enrolled,
      completed,
      completionPct,
      avgScore,
      createdDate: "N/A",
      status: course.published ? "Published" : "Draft",
      students: course.enrollments.map((enrollment) => ({
        id: enrollment.user.id,
        name: enrollment.user.name,
        email: enrollment.user.email,
        progress: enrollment.progress,
      })),
    };
  });

  const totalCourses = courses.length;
  const totalEnrollments = enrollments.length;
  const avgCompletionRate =
    enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / enrollments.length)
      : 0;
  const avgQuizScore =
    quizSubs.length > 0
      ? Math.round(
          quizSubs.reduce((sum, submission) => {
            const max = submission.totalMarks || 1;
            return sum + (submission.obtainedMarks / max) * 100;
          }, 0) / quizSubs.length
        )
      : 0;

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Courses Report</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Courses", value: totalCourses },
          { label: "Total Enrollments", value: totalEnrollments },
          { label: "Avg Completion Rate", value: `${avgCompletionRate}%` },
          { label: "Avg Quiz Score", value: `${avgQuizScore}%` },
        ].map((item) => (
          <Card key={item.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">{item.label}</p>
            <p className="text-2xl font-medium text-zinc-900 mt-1">{item.value}</p>
          </Card>
        ))}
      </div>

      <CoursesTable courses={courseRows} />
    </PageWrapper>
  );
}
