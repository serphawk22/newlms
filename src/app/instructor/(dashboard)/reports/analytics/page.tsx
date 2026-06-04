import { BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getInstructorOrgContext } from "../_lib";
import { PageWrapper } from "../_components/page-wrapper";
import { AnalyticsCharts } from "../_components/analytics-charts";
import { AccessDenied } from "@/components/AccessDenied";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
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

  const [enrollments, quizSubs, members, courses, views] = await Promise.all([
    prisma.enrollment.findMany({
      where: { course: { organizationId: orgId } },
      select: { progress: true, enrolledAt: true, userId: true, courseId: true },
    }),
    prisma.quizSubmission.findMany({
      where: { quiz: { course: { organizationId: orgId } } },
      select: { obtainedMarks: true, totalMarks: true, quiz: { select: { course: { select: { title: true } } } } },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: orgId, role: "STUDENT" },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.course.findMany({ where: { organizationId: orgId }, select: { id: true, title: true } }),
    prisma.materialView.findMany({
      where: { material: { course: { organizationId: orgId } } },
      select: { studentId: true },
    }),
  ]);

  const now = new Date();
  const monthLabels = Array.from({ length: 12 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const enrollmentTrends = monthLabels.map((label) => ({
    label: label.slice(2),
    value: enrollments.filter((item) => item.enrolledAt.toISOString().slice(0, 7) === label).length,
  }));

  const quizPerformanceMap = new Map<string, { total: number; count: number }>();
  for (const submission of quizSubs) {
    const key = submission.quiz.course.title;
    const entry = quizPerformanceMap.get(key) || { total: 0, count: 0 };
    const max = submission.totalMarks || 1;
    entry.total += (submission.obtainedMarks / max) * 100;
    entry.count += 1;
    quizPerformanceMap.set(key, entry);
  }

  const quizPerformance = Array.from(quizPerformanceMap.entries()).map(([course, entry]) => ({
    course: course.length > 10 ? `${course.slice(0, 10)}...` : course,
    score: Math.round(entry.total / entry.count),
  }));

  const days = Array.from({ length: 30 }, (_, index) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - index));
    return d.toISOString().slice(0, 10);
  });

  const engagement = days.map((day) => {
    const activeIds = new Set(
      enrollments
        .filter((item) => item.enrolledAt.toISOString().slice(0, 10) === day)
        .map((item) => item.userId)
    );
    return { day: day.slice(5), active: activeIds.size };
  });

  const enrolledCount = enrollments.length;
  const startedCount = enrollments.filter((item) => item.progress > 0).length;
  const halfwayCount = enrollments.filter((item) => item.progress >= 50).length;
  const completedCount = enrollments.filter((item) => item.progress >= 100).length;

  const funnel = [
    { stage: "Enrolled", value: enrolledCount },
    { stage: "Started", value: startedCount },
    { stage: "Halfway", value: halfwayCount },
    { stage: "Completed", value: completedCount },
  ];

  const avgCompletionRate = enrolledCount > 0
    ? Math.round(enrollments.reduce((sum, item) => sum + item.progress, 0) / enrolledCount)
    : 0;

  const studentActivityCount = new Map<string, number>();
  views.forEach((item) => {
    studentActivityCount.set(item.studentId, (studentActivityCount.get(item.studentId) || 0) + 1);
  });
  let mostActiveStudent = "N/A";
  let maxCount = 0;
  for (const member of members) {
    const count = studentActivityCount.get(member.userId) || 0;
    if (count > maxCount) {
      maxCount = count;
      mostActiveStudent = member.user.name || member.user.email;
    }
  }

  const coursePopularity = new Map<string, number>();
  enrollments.forEach((item) => {
    coursePopularity.set(item.courseId, (coursePopularity.get(item.courseId) || 0) + 1);
  });
  let mostPopularCourse = "N/A";
  let popularCount = 0;
  for (const course of courses) {
    const count = coursePopularity.get(course.id) || 0;
    if (count > popularCount) {
      popularCount = count;
      mostPopularCourse = course.title;
    }
  }

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Analytics</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Training Time", value: `${views.length} views` },
          { label: "Avg Completion Rate", value: `${avgCompletionRate}%` },
          { label: "Most Active Student", value: mostActiveStudent },
          { label: "Most Popular Course", value: mostPopularCourse },
        ].map((item) => (
          <Card key={item.label} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{item.label}</p>
            <p className="text-lg font-medium mt-1 truncate" style={{ color: "var(--foreground)" }}>{item.value}</p>
          </Card>
        ))}
      </div>

      <AnalyticsCharts
        enrollmentTrends={enrollmentTrends}
        quizPerformance={quizPerformance}
        engagement={engagement}
        funnel={funnel}
      />
    </PageWrapper>
  );
}
