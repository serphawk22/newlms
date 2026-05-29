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
        <BarChart2 className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-zinc-200 shadow-sm">
            <div className="p-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 animate-pulse mb-2" />
              <div className="h-6 bg-zinc-100 rounded animate-pulse mb-2" />
              <div className="h-3 bg-zinc-100 rounded animate-pulse w-20" />
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
        <BarChart2 className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: totalStudents, icon: <Users className="w-4 h-4" />, color: "bg-blue-100 text-blue-600" },
          { label: "Instructors", value: totalInstructors, icon: <Users className="w-4 h-4" />, color: "bg-emerald-100 text-emerald-600" },
          { label: "Total Courses", value: totalCourses, icon: <BookOpen className="w-4 h-4" />, color: "bg-amber-100 text-amber-600" },
          { label: "Published", value: publishedCourses, icon: <CheckCircle className="w-4 h-4" />, color: "bg-purple-100 text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-zinc-200 shadow-sm">
            <div className="p-4">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                {stat.icon}
              </div>
              <p className="text-xl font-medium text-zinc-900">{stat.value}</p>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-zinc-200 shadow-sm">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Enrollments</h3>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{totalEnrollments}</p>
            <p className="text-xs text-zinc-500">Total course enrollments across all courses</p>
          </div>
        </Card>
        <Card className="border-zinc-200 shadow-sm">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Completion</h3>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{completionRate}%</p>
            <p className="text-xs text-zinc-500">{completedCourses} completed out of {totalEnrollments} enrollments</p>
          </div>
        </Card>
        <Card className="border-zinc-200 shadow-sm">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">In Progress</h3>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{inProgress}</p>
            <p className="text-xs text-zinc-500">Enrollments currently in progress</p>
          </div>
        </Card>
      </div>

      <Card className="border-zinc-200 shadow-sm">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-3">Course Overview</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2">Course</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.slice(0, 10).map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-3 py-2 text-sm text-zinc-900">{c.title}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        c.published ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                      }`}>
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
