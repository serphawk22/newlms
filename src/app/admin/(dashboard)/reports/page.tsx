import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { getAdminContext } from "../_lib";
import { BarChart2, Users, BookOpen, CheckCircle, Clock, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Reports</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
            <div className="p-4">
              <div className="w-8 h-8 rounded-lg mb-2" style={{ background: "var(--secondary-background)" }} />
              <div className="h-6 rounded mb-2" style={{ background: "var(--secondary-background)" }} />
              <div className="h-3 rounded w-20" style={{ background: "var(--secondary-background)" }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function AdminReportsContent() {
  const ctx = await getAdminContext();

  const [enrollments, courses, members] = await Promise.all([
    prisma.enrollment.findMany({
      where: { course: { organizationId: ctx.orgId } },
      select: { progress: true, enrolledAt: true },
    }),
    prisma.course.findMany({
      where: { organizationId: ctx.orgId },
      select: { id: true, title: true, published: true },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.orgId },
      select: { role: true },
    }),
  ]);

  const totalStudents = members.filter((m) => m.role === "STUDENT").length;
  const totalInstructors = members.filter((m) => m.role === "INSTRUCTOR").length;
  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.published).length;
  const totalEnrollments = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.progress >= 100).length;
  const inProgress = enrollments.filter((e) => e.progress > 0 && e.progress < 100).length;
  const completionRate = totalEnrollments > 0 ? Math.round((completedCourses / totalEnrollments) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Reports</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: totalStudents, icon: <Users className="w-4 h-4" style={{ color: "#D9252A" }} />, color: "rgba(217,37,42,0.12)" },
          { label: "Instructors", value: totalInstructors, icon: <Users className="w-4 h-4" style={{ color: "#D9252A" }} />, color: "rgba(217,37,42,0.12)" },
          { label: "Total Courses", value: totalCourses, icon: <BookOpen className="w-4 h-4" style={{ color: "#D9252A" }} />, color: "rgba(217,37,42,0.12)" },
          { label: "Published", value: publishedCourses, icon: <CheckCircle className="w-4 h-4" style={{ color: "#D9252A" }} />, color: "rgba(217,37,42,0.12)" },
        ].map((stat) => (
          <Card key={stat.label} style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
            <div className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: stat.color }}>
                {stat.icon}
              </div>
              <p className="text-xl font-medium" style={{ color: "var(--foreground)" }}>{stat.value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Enrollments</h3>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{totalEnrollments}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Total course enrollments across all courses</p>
          </div>
        </Card>
        <Card style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Completion</h3>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{completionRate}%</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{completedCourses} completed out of {totalEnrollments} enrollments</p>
          </div>
        </Card>
        <Card style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>In Progress</h3>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{inProgress}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Enrollments currently in progress</p>
          </div>
        </Card>
      </div>

      <Card style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
        <div className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>Course Overview</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest px-3 py-2" style={{ color: "var(--muted-foreground)" }}>Course</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest px-3 py-2" style={{ color: "var(--muted-foreground)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.slice(0, 10).map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[rgba(217,37,42,0.04)]">
                    <td className="px-3 py-2 text-sm" style={{ color: "var(--foreground)" }}>{c.title}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider`} style={{
                        background: c.published ? "rgba(16,185,129,0.12)" : "var(--secondary-background)",
                        color: c.published ? "#10B981" : "var(--muted-foreground)",
                        border: c.published ? "1px solid rgba(16,185,129,0.25)" : "1px solid var(--border)"
                      }}>
                        {c.published ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <div className="container-page">
      <Suspense fallback={<ReportsSkeleton />}>
        <AdminReportsContent />
      </Suspense>
    </div>
  );
}
