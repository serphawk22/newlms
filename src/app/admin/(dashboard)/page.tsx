import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Card, CardContent } from "@/components/ui/card";

import { AdminInstructorTable, AdminCourseTable } from "@/components/admin/AdminAnalyticsTables";
import { AdminStudentSection } from "@/components/admin/AdminStudentSection";
import { AdminCommentsPanel } from "@/components/admin/AdminCommentsPanel";
import { PendingRequestsCard } from "@/components/admin/PendingRequestsCard";
import type { PendingUserItem } from "@/components/admin/PendingRequestsCard";
import { getAdminContext } from "./_lib";

import { unstable_cache } from "next/cache";

const getCachedAdminAnalytics = (orgId: string) => unstable_cache(
  async () => {
    const [
      studentCount, instructorCount, totalCoursesCount, publishedCount,
      enrollmentCount, instructorMembers, orgCourses, studentMembers,
    ] = await Promise.all([
      prisma.organizationMember.count({ where: { organizationId: orgId, role: "STUDENT" } }),
      prisma.organizationMember.count({ where: { organizationId: orgId, role: "INSTRUCTOR" } }),
      prisma.course.count({ where: { organizationId: orgId } }),
      prisma.course.count({ where: { organizationId: orgId, published: true } }),
      prisma.enrollment.count({ where: { course: { organizationId: orgId } } }),
      prisma.organizationMember.findMany({
        where: { organizationId: orgId, role: "INSTRUCTOR" },
        include: {
          user: {
            include: {
              coursesCreated: {
                where: { organizationId: orgId },
                include: { _count: { select: { enrollments: true } } },
              },
            },
          },
        },
      }),
      prisma.course.findMany({
        where: { organizationId: orgId },
        include: { creator: { select: { name: true } }, _count: { select: { enrollments: true } } },
        orderBy: { id: "desc" },
        take: 20,
      }),
      prisma.organizationMember.findMany({
        where: { organizationId: orgId, role: "STUDENT" },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { id: "desc" },
        take: 10,
      }),
    ]);

    const activeEnrollments = await prisma.enrollment.findMany({
      where: { course: { organizationId: orgId } },
      select: { userId: true },
      distinct: ["userId"],
    });

    const courses = await prisma.course.findMany({
      where: { organizationId: orgId },
      select: { id: true, title: true },
      orderBy: { id: "desc" },
    });

    return {
      adminStats: {
        totalStudents: studentCount,
        activeInstructors: instructorCount,
        totalCourses: totalCoursesCount,
        publishedCourses: publishedCount,
        totalEnrollments: enrollmentCount,
      },
      instructorRows: instructorMembers.map((m) => ({
        id: m.id,
        name: m.user?.name || "Unnamed",
        coursesCreated: m.user?.coursesCreated.length || 0,
        enrolledStudents: m.user?.coursesCreated.reduce((sum, c) => sum + c._count.enrollments, 0) || 0,
        role: m.role,
      })),
      courseRows: orgCourses.map((c) => ({
        id: c.id,
        title: c.title,
        createdBy: c.creator?.name || "Unknown",
        published: c.published,
        enrollmentCount: c._count.enrollments,
      })),
      studentData: {
        total: studentCount,
        active: activeEnrollments.length,
        recentlyJoined: studentMembers.map((m) => ({
          id: m.user?.id || "",
          name: m.user?.name || "Unnamed",
          email: m.user?.email || "",
        })),
      },
      courses: courses.map((c: any) => ({ id: c.id, title: c.title })),
    };
  },
  [`admin-analytics-${orgId}`],
  { tags: ["admin-analytics"] }
)();

async function AdminDashboardContent() {
  const ctx = await getAdminContext();
  const data = await getCachedAdminAnalytics(ctx.orgId);

  const { adminStats, instructorRows, courseRows, studentData, courses } = data;

  // Pending users — query by status directly to catch all (email + Google signups)
  const pendingUsersRaw = await prisma.user.findMany({
    where: { status: "PENDING" },
    select: {
      id: true, name: true, email: true, loginCode: true,
      memberships: { select: { role: true } },
    },
    orderBy: { id: "desc" },
    take: 20,
  });

  const pendingUsers: PendingUserItem[] = pendingUsersRaw.map((u) => {
    const role =
      u.memberships[0]?.role ??
      (u.loginCode?.startsWith("STU") ? "STUDENT" as const : u.loginCode?.startsWith("INS") ? "INSTRUCTOR" as const : "STUDENT" as const);
    return { id: u.id, name: u.name, email: u.email, role };
  });

  return (
    <div className="space-y-6">
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        <h1 className="text-base font-medium" style={{ color: "var(--foreground)" }}>Admin Dashboard</h1>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Students", value: adminStats.totalStudents, href: "/admin/users?tab=students" },
            { label: "Instructors", value: adminStats.activeInstructors, href: "/admin/users?tab=instructors" },
            { label: "Total Courses", value: adminStats.totalCourses, href: "/admin/all-courses" },
            { label: "Published", value: adminStats.publishedCourses, href: "/admin/all-courses?published=true" },
            { label: "Enrollments", value: adminStats.totalEnrollments, href: "/admin/reports" },
          ].map((stat) => (
            <Link key={stat.label} href={stat.href} className="group block">
              <Card className="transition-all duration-200 cursor-pointer hover:-translate-y-0.5" style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
                <CardContent className="p-4">
                  <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{stat.value}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminInstructorTable rows={instructorRows} />
          <AdminCourseTable rows={courseRows} />
        </div>

        <AdminStudentSection data={studentData} />

        <PendingRequestsCard users={pendingUsers} totalPending={pendingUsers.length} />

        <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>Admin Comments</h3>
          <AdminCommentsPanel orgId={ctx.orgId} courses={courses} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded" style={{ background: "var(--muted)" }} />
        <div className="grid grid-cols-5 gap-6">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: "var(--muted)" }} />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-72 rounded-xl" style={{ background: "var(--muted)" }} />
          <div className="h-72 rounded-xl" style={{ background: "var(--muted)" }} />
        </div>
        <div className="h-32 rounded-xl" style={{ background: "var(--muted)" }} />
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
