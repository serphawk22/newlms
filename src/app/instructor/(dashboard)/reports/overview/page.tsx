import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle, Clock } from "lucide-react";
import { ActivityChart, CompletionDonut } from "../_components/overview-charts";
import { PageWrapper } from "../_components/page-wrapper";
import { getInstructorOrgContext } from "../_lib";
import { AccessDenied } from "@/components/AccessDenied";

async function OverviewContent() {
  const { orgId } = await getInstructorOrgContext();

  const [members, enrollments, courses] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      select: { userId: true },
    }),
    prisma.enrollment.findMany({
      where: { course: { organizationId: orgId } },
      select: { progress: true, enrolledAt: true },
    }),
    prisma.course.findMany({
      where: { organizationId: orgId },
      select: { id: true, title: true },
    }),
  ]);

  const activeUsers = members.length;
  const assignedCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.progress >= 100).length;
  const inProgressCourses = enrollments.filter((e) => e.progress > 0 && e.progress < 100).length;
  const notStartedCourses = enrollments.filter((e) => e.progress === 0).length;

  const now = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  const activityData = days.map((day) => {
    const dayCompletions = enrollments.filter(
      (e) => e.progress >= 100 && e.enrolledAt.toISOString().slice(0, 10) <= day
    );
    return {
      date: day.slice(5),
      logins: 0,
      completions: dayCompletions.length,
    };
  });

  const statRows = [
    { icon: Users, label: "Active users", value: activeUsers },
    { icon: Clock, label: "Never logged in", value: 0 },
    { icon: BookOpen, label: "Assigned courses", value: assignedCourses },
    { icon: CheckCircle, label: "Completed courses", value: completedCourses },
  ];

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Reports Overview</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-zinc-200 shadow-sm">
            <div className="p-5 space-y-0 divide-y divide-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900 pb-3">Overview</h3>
              {statRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-3 hover:bg-zinc-50 -mx-5 px-5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm text-zinc-600">{row.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900">{row.value}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <div className="p-5">
              <ActivityChart data={activityData} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-zinc-200 shadow-sm">
            <div className="p-5 space-y-0 divide-y divide-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900 pb-3">Learning Structure</h3>
              {[
                { label: "Courses", value: courses.length },
                { label: "Categories", value: 0 },
                { label: "Branches", value: 0 },
                { label: "Groups", value: 0 },
                { label: "Learning Paths", value: 0 },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2.5 hover:bg-zinc-50 -mx-5 px-5 transition-colors"
                >
                  <span className="text-sm text-zinc-600">{row.label}</span>
                  <span className="text-sm font-semibold text-zinc-900">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <div className="p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Courses</h3>
              <CompletionDonut
                completed={completedCourses}
                inProgress={inProgressCourses}
                notStarted={notStartedCourses}
                totalCourses={courses.length}
              />
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

export default async function OverviewPage() {
  const { role } = await getInstructorOrgContext();
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
  return <OverviewContent />;
}
