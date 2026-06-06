import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { StudentDashboardClient } from "@/components/StudentDashboardClient";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: { userId?: string; name?: string; email?: string; organizationName?: string; role?: string } = {};
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as typeof payload;
  } catch {
    redirect("/login");
  }

  const userId = (payload.userId ?? "") as string;
  const userName = payload.name ?? "Student";
  const orgName = payload.organizationName ?? "";

  // Get user with memberships
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      memberships: { select: { organizationId: true }, take: 1 },
    },
  });

  if (!user || user.memberships.length === 0) redirect("/login");
  const orgId = user.memberships[0].organizationId;

  // ── 1. Fetch initial user data sequentially to prevent Neon connection spike ──
  const allEnrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          published: true,
          creator: { select: { name: true } },
          _count: { select: { modules: true, enrollments: true, assignments: true, quizzes: true, readingMaterials: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
    where: { studentId: userId },
    select: { submittedAt: true, assignment: { select: { courseId: true } } },
  });

  // Track daily login for today
  const todayStr = new Date().toISOString().split("T")[0];
  try {
    await prisma.dailyLogin.upsert({
      where: { userId_dateStr: { userId, dateStr: todayStr } },
      update: {},
      create: { userId, dateStr: todayStr },
    });
    // Fire-and-forget badge sync — checks Early Bird & Dedicated on login
    const { syncBadges } = await import("@/lib/badges");
    syncBadges(userId).catch((e: unknown) => console.warn("[dashboard] badge sync error:", e));
  } catch (err) {
    // ignore constraint errors if concurrent
    void err;
  }

  const dailyLogins = await prisma.dailyLogin.findMany({
    where: { userId },
    select: { createdAt: true },
  });

  const allOrgCourses = await prisma.course.findMany({
    where: { organizationId: orgId, published: true },
    include: {
      creator: { select: { name: true } },
      _count: { select: { modules: true, enrollments: true } },
    },
    orderBy: { id: "desc" },
  });

  const quizSubmissions = await prisma.quizSubmission.findMany({
    where: { studentId: userId },
    select: { submittedAt: true, quiz: { select: { courseId: true } } },
  });

  // ── Derive values from fetched data to save queries ────────────────────────
  const enrollments = allEnrollments.filter(e => e.status === "ACTIVE");
  const completedAssignments = assignmentSubmissions.length;
  const enrollmentDates = allEnrollments;

  const activeEnrolledCourseIds = enrollments
    .filter((e) => e.course.published)
    .map((e) => e.course.id);

  // Fetch material views for real progress calculation
  const materialViews = activeEnrolledCourseIds.length > 0
    ? await prisma.materialView.findMany({
        where: { studentId: userId, material: { courseId: { in: activeEnrolledCourseIds } } },
        select: { materialId: true, material: { select: { courseId: true } } },
      })
    : [];

  // Build per-course activity maps for real progress
  const asgByCourse = new Map<string, number>();
  for (const s of assignmentSubmissions) {
    const cid = s.assignment.courseId;
    asgByCourse.set(cid, (asgByCourse.get(cid) ?? 0) + 1);
  }
  const qzByCourse = new Map<string, number>();
  for (const s of quizSubmissions) {
    const cid = s.quiz.courseId;
    qzByCourse.set(cid, (qzByCourse.get(cid) ?? 0) + 1);
  }
  const matByCourse = new Map<string, Set<string>>();
  for (const v of materialViews) {
    const cid = v.material.courseId;
    if (!matByCourse.has(cid)) matByCourse.set(cid, new Set());
    matByCourse.get(cid)!.add(v.materialId);
  }

  function getDashboardProgress(courseId: string, totalAsg: number, totalQz: number, totalMat: number): number {
    const total = totalAsg + totalQz + totalMat;
    if (total === 0) return 0;
    const done =
      (asgByCourse.get(courseId) ?? 0) +
      (qzByCourse.get(courseId) ?? 0) +
      (matByCourse.get(courseId)?.size ?? 0);
    return Math.min(Math.round((done / total) * 100), 100);
  }

  const enrolledCourses = enrollments
    .filter((e) => e.course.published)
    .map((e) => ({
      id: e.course.id,
      title: e.course.title,
      progress: getDashboardProgress(
        e.course.id,
        e.course._count.assignments,
        e.course._count.quizzes,
        e.course._count.readingMaterials,
      ),
      instructorName: e.course.creator.name ?? "Instructor",
      modulesCount: e.course._count.modules,
      enrollmentsCount: e.course._count.enrollments,
    }));

  const enrolledCourseIds = enrolledCourses.map((c) => c.id);

  // ── 2. Sequential secondary queries ──
  let pendingQuizzes: any[] = [];
  let pendingAssignments: any[] = [];
  let studySessions = 0;
  let liveSessions: any[] = [];

  if (enrolledCourseIds.length > 0) {
    pendingQuizzes = await prisma.quiz.findMany({
      where: {
        courseId: { in: enrolledCourseIds },
        submissions: { none: { studentId: userId } },
      },
      select: { id: true, title: true, courseId: true, questions: { select: { id: true } } },
    });

    pendingAssignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: enrolledCourseIds },
        submissions: { none: { studentId: userId } },
      },
      select: { id: true, title: true, courseId: true },
    });

    studySessions = await prisma.liveSession.count({
      where: {
        courseId: { in: enrolledCourseIds },
        status: "COMPLETED",
      },
    });

    liveSessions = await prisma.liveSession.findMany({
      where: {
        courseId: { in: enrolledCourseIds },
        status: { in: ["SCHEDULED", "ONGOING"] },
      },
      include: { course: { select: { title: true } } },
      orderBy: { scheduledAt: "asc" },
    });
  }

  // ── Continue learning — course with lowest non-zero progress (most active) ──
  const continueLearningCourse = enrolledCourses.find((c) => c.progress < 100) ?? enrolledCourses[0] ?? null;

  const ongoingSession = liveSessions.find((s) => s.status === "ONGOING") ?? null;

  // Create enrollment status map
  const enrollmentMap = new Map(allEnrollments.map((e) => [e.courseId, e]));

  const trendingCourses = allOrgCourses.map((c) => {
    const enr = enrollmentMap.get(c.id);
    return {
      id: c.id,
      title: c.title,
      instructorName: c.creator.name ?? "Instructor",
      modulesCount: c._count.modules,
      enrollmentsCount: c._count.enrollments,
      enrollmentStatus: (enr?.status ?? null) as "PENDING" | "ACTIVE" | "REJECTED" | null,
      progress: enr ? Math.round(enr.progress) : 0,
    };
  });

  // ── Learning streak (based on enrollment dates as activity markers) ────────
  // Use enrollment dates + quiz submission dates + assignment submission dates
  const activityDates: Date[] = [];

  allEnrollments.forEach((e) => {
    // We use the enrollment data we already have; dates not available here
  });

  quizSubmissions.forEach((q) => activityDates.push(q.submittedAt));
  assignmentSubmissions.forEach((a) => activityDates.push(a.submittedAt));
  dailyLogins.forEach((d: { createdAt: Date }) => activityDates.push(d.createdAt));

  // Compute unique active days this month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const activeDaysSet = new Set<string>();
  activityDates.forEach((d) => {
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      activeDaysSet.add(d.getDate().toString());
    }
  });

  // Also count enrollment dates as active days (if this month)
  enrollmentDates.forEach((e) => {
    const d = new Date(e.enrolledAt);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      activeDaysSet.add(d.getDate().toString());
    }
  });

  const activeDays = activeDaysSet.size;

  // Compute streak (consecutive days up to today with activity)
  const allActivityDatesWithEnrollments: Date[] = [
    ...activityDates,
    ...enrollmentDates.map((e) => new Date(e.enrolledAt)),
  ];

  const uniqueDays = new Set(
    allActivityDatesWithEnrollments.map((d) => {
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      return dd.getTime();
    })
  );

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Calculate current streak
  for (let i = 0; i <= 365; i++) {
    const checkDate = new Date(todayStart);
    checkDate.setDate(todayStart.getDate() - i);
    if (uniqueDays.has(checkDate.getTime())) {
      if (i === 0 || currentStreak > 0) currentStreak++;
    } else {
      if (i > 0) break;
    }
  }

  // Calculate best streak from sorted unique days
  const sortedDays = Array.from(uniqueDays).sort();
  sortedDays.forEach((day, idx) => {
    if (idx === 0) {
      tempStreak = 1;
    } else {
      const prev = sortedDays[idx - 1];
      const diff = (day - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
  });

  // Active days in current month as array of day numbers
  const activeDayNumbers = Array.from(activeDaysSet).map(Number);

  return (
    <StudentDashboardClient
      userName={userName}
      orgName={orgName}
      enrolledCoursesCount={enrolledCourses.length}
      completedAssignments={completedAssignments}
      pendingQuizzesCount={pendingQuizzes.length}
      studySessions={studySessions}
      enrolledCourses={enrolledCourses}
      continueLearningCourse={continueLearningCourse}
      pendingQuizzes={pendingQuizzes.map((q) => ({
        id: q.id,
        title: q.title,
        courseId: q.courseId,
        questionCount: q.questions.length,
      }))}
      pendingAssignments={pendingAssignments}
      ongoingSession={ongoingSession ? { roomId: ongoingSession.roomId } : null}
      trendingCourses={trendingCourses}
      currentStreak={currentStreak}
      bestStreak={bestStreak}
      activeDays={activeDays}
      activeDayNumbers={activeDayNumbers}
      currentMonth={currentMonth}
      currentYear={currentYear}
    />
  );
}
