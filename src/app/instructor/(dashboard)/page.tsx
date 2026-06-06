import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, BookOpen, GraduationCap, CheckCircle, BarChart3 } from "lucide-react";

import { AdminInstructorTable, AdminCourseTable } from "@/components/admin/AdminAnalyticsTables";
import { AdminStudentSection } from "@/components/admin/AdminStudentSection";
import { AdminCommentsPanel } from "@/components/admin/AdminCommentsPanel";
import { InstructorDashboardClient } from "@/components/InstructorDashboardClient";
import { getDashboardContext } from "./_lib";
import { triggerCourseCreatedNotifications } from "@/lib/email-notifications-helper";

async function removeMember(formData: FormData) {
  "use server";
  const memberId = formData.get("memberId") as string;
  if (memberId) {
    await prisma.organizationMember.delete({ where: { id: memberId } });
    revalidatePath("/instructor");
  }
}

async function createCourse(formData: FormData) {
  "use server";
  const rawTitle     = formData.get("title");
  const rawOrgId     = formData.get("orgId");
  const rawCreatorId = formData.get("creatorId");
  const title     = typeof rawTitle     === "string" ? rawTitle.trim()     : "";
  const orgId     = typeof rawOrgId     === "string" ? rawOrgId.trim()     : "";
  const creatorId = typeof rawCreatorId === "string" ? rawCreatorId.trim() : "";
  if (!title || !orgId || !creatorId) return;
  try {
    const [orgExists, userExists] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId },     select: { id: true } }),
      prisma.user.findUnique({         where: { id: creatorId }, select: { id: true, name: true, email: true } }),
    ]);
    if (!orgExists || !userExists) return;
    const course = await prisma.course.create({
      data: { title, organizationId: orgId, creatorId, published: true },
    });
    const { logCourseActivity } = await import("@/lib/activity");
    await logCourseActivity(course.id, `Course created by ${userExists.name || userExists.email}`);
    // Trigger course creation email notifications in background
    triggerCourseCreatedNotifications(course.id).catch((err) =>
      console.error("[createCourse dashboard notification error]", err)
    );
    revalidatePath("/instructor");
    redirect(`/instructor/courses/${course.id}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
  }
}

const getCachedInstructorData = (orgId: string, userId: string) => unstable_cache(
  async () => {
    const [courses, allMembers, myCoursesCount, myStudentsCount] = await Promise.all([
      prisma.course.findMany({ where: { organizationId: orgId }, select: { id: true, title: true }, orderBy: { id: "desc" } }),
      prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        include: { user: true },
        orderBy: { role: "asc" },
      }),
      prisma.course.count({ where: { creatorId: userId } }),
      prisma.enrollment.count({ where: { course: { creatorId: userId } } }),
    ]);
    return { courses, allMembers, myCoursesCount, myStudentsCount };
  },
  [`instructor-base-${userId}-${orgId}`],
  { revalidate: 60 }
)();

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
        name: m.user.name || "Unnamed",
        coursesCreated: m.user.coursesCreated.length,
        enrolledStudents: m.user.coursesCreated.reduce((sum, c) => sum + c._count.enrollments, 0),
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
          id: m.user.id,
          name: m.user.name || "Unnamed",
          email: m.user.email,
        })),
      },
    };
  },
  [`instructor-admin-analytics-${orgId}`],
  { revalidate: 120 }
)();

async function InstructorDashboardContent() {
  const ctx = await getDashboardContext();
  const isFounder = ctx.role === "ADMIN";

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAgo);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const monthLabels = Array.from({ length: 4 }, (_, i) => `Week ${i + 1}`);

  console.log("[Dashboard] Weekly Range:", weekAgo);
  console.log("[Dashboard] Monthly Range:", monthAgo);

  // Fire all queries in parallel to avoid waterfalls
  const [
    instructorData,
    adminData,
    allQuizzes,
    allLiveSessions,
    pendingAssignments,
    weeklyEnrollments,
    monthlyEnrollments,
  ] = await Promise.all([
    getCachedInstructorData(ctx.orgId, ctx.userId),
    isFounder ? getCachedAdminAnalytics(ctx.orgId) : Promise.resolve(null),
    prisma.quiz.findMany({
      where: {
        course: {
          organizationId: ctx.orgId,
          ...(isFounder ? {} : { creatorId: ctx.userId }),
        },
      },
      include: { course: { select: { title: true } }, _count: { select: { questions: true } } },
      orderBy: { id: "desc" },
      take: 5,
    }),
    prisma.liveSession.findMany({
      where: {
        course: {
          organizationId: ctx.orgId,
          ...(isFounder ? {} : { creatorId: ctx.userId }),
        },
        status: { in: ["SCHEDULED", "ONGOING"] },
      },
      include: { course: { select: { title: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.assignment.count({
      where: {
        course: {
          organizationId: ctx.orgId,
          ...(isFounder ? {} : { creatorId: ctx.userId }),
        },
      },
    }),
    prisma.enrollment.findMany({
      where: {
        course: {
          organizationId: ctx.orgId,
          ...(isFounder ? {} : { creatorId: ctx.userId }),
        },
        enrolledAt: { gte: weekAgo },
      },
      select: { enrolledAt: true },
    }),
    prisma.enrollment.findMany({
      where: {
        course: {
          organizationId: ctx.orgId,
          ...(isFounder ? {} : { creatorId: ctx.userId }),
        },
        enrolledAt: { gte: monthAgo },
      },
      select: { enrolledAt: true },
    }),
  ]);

  const { courses, myCoursesCount, myStudentsCount } = instructorData;

  let adminStats = { totalStudents: 0, activeInstructors: 0, totalCourses: 0, publishedCourses: 0, totalEnrollments: 0 };
  let instructorRows: any[] = [];
  let courseRows: any[] = [];
  let studentData: any = { total: 0, active: 0, recentlyJoined: [] };

  if (isFounder && adminData) {
    adminStats = adminData.adminStats;
    instructorRows = adminData.instructorRows;
    courseRows = adminData.courseRows;
    studentData = adminData.studentData;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const enrollCounts = weekDays.map(day =>
    weeklyEnrollments.filter(e => e.enrolledAt.toISOString().slice(0, 10) === day).length
  );

  const monthCounts = monthLabels.map((_, weekIdx) => {
    const weekStart = new Date(monthAgo.getTime() + weekIdx * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return monthlyEnrollments.filter(e => e.enrolledAt >= weekStart && e.enrolledAt < weekEnd).length;
  });

  console.log("[Dashboard] Week Days:", weekDays);
  console.log("[Dashboard] Weekly Data:", enrollCounts);
  console.log("[Dashboard] Monthly Labels:", monthLabels);
  console.log("[Dashboard] Monthly Data:", monthCounts);

  return (
    <>
      {/* Dashboard interactive section (client) */}
        <InstructorDashboardClient
          greeting={greeting}
          userName={ctx.userName}
          userId={ctx.userId}
        totalCourses={adminStats.totalCourses || myCoursesCount}
        totalStudents={adminStats.totalStudents || myStudentsCount}
        activeQuizzes={allQuizzes.length}
        pendingAssignments={pendingAssignments}
        allQuizzes={allQuizzes.map(q => ({
          id: q.id, title: q.title, courseTitle: q.course.title, questionCount: q._count.questions,
        }))}
        allLiveSessions={allLiveSessions.map(s => ({
          id: s.id, title: s.title, scheduledAt: s.scheduledAt.toISOString(),
          status: s.status, roomId: s.roomId, courseTitle: s.course.title,
        }))}
        enrollCounts={enrollCounts}
        weekDays={weekDays}
        monthLabels={monthLabels}
        monthCounts={monthCounts}
      />

      {/* Admin section (server rendered) */}
      {isFounder && (
        <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6" id="admin-analytics">
          <h2 className="text-base font-medium pt-4 border-t border-zinc-200" style={{ color: "var(--foreground)" }}>Organization Overview</h2>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Total Students",
                value: adminStats.totalStudents,
                icon: GraduationCap,
                href: "/admin/users?tab=students",
              },
              {
                label: "Instructors",
                value: adminStats.activeInstructors,
                icon: Users,
                href: "/admin/users?tab=instructors",
              },
              {
                label: "Total Courses",
                value: adminStats.totalCourses,
                icon: BookOpen,
                href: "/admin/all-courses",
              },
              {
                label: "Published",
                value: adminStats.publishedCourses,
                icon: CheckCircle,
                href: "/admin/all-courses?published=true",
              },
              {
                label: "Enrollments",
                value: adminStats.totalEnrollments,
                icon: BarChart3,
                href: "/admin/reports",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Link key={stat.label} href={stat.href} className="group block">
                  <Card className="transition-all duration-200 cursor-pointer hover:-translate-y-0.5" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <TrendingUp className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
                      </div>
                      <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{stat.value}</p>
                      <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdminInstructorTable rows={instructorRows} />
            <AdminCourseTable rows={courseRows} />
          </div>

          <AdminStudentSection data={studentData} />

          <div className="pt-4 border-t border-zinc-100">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Admin Comments</h3>
            <AdminCommentsPanel
              orgId={ctx.orgId}
              courses={courses.map((c: any) => ({ id: c.id, title: c.title }))}
            />
          </div>

        </div>
      )}
    </>
  );
}

export default function WorkspaceDashboard() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-zinc-200 rounded" />
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-200 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-2 h-72 bg-zinc-200 rounded-xl" />
          <div className="col-span-3 h-72 bg-zinc-200 rounded-xl" />
        </div>
        <div className="h-32 bg-zinc-200 rounded-xl" />
      </div>
    }>
      <InstructorDashboardContent />
    </Suspense>
  );
}
