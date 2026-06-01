import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { StudentProgressClient } from "@/components/StudentProgressClient";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function StudentProgressPage() {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: { userId?: string; name?: string } = {};
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as typeof payload;
  } catch {
    redirect("/login");
  }

  const userId = payload.userId ?? "";
  if (!userId) redirect("/login");

  // ── Enrollments ───────────────────────────────────────────────────────────────
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          published: true,
          _count: { select: { modules: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const activeEnrollments = enrollments.filter((e) => e.course.published);

  const totalEnrolled = activeEnrollments.length;

  const completedCourses = activeEnrollments.filter(
    (e) => Math.round(e.progress) >= 100
  ).length;

  // Estimate completed modules: for each course, floor(progress% × moduleCount)
  const estimatedCompletedModules = activeEnrollments.reduce((sum, e) => {
    const pct = Math.min(e.progress, 100) / 100;
    return sum + Math.floor(pct * e.course._count.modules);
  }, 0);

  const courses = activeEnrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    progress: Math.round(e.progress),
    moduleCount: e.course._count.modules,
  }));

  // ── Assignment submissions ────────────────────────────────────────────────────
  const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
    where: { studentId: userId },
    select: { submittedAt: true },
    orderBy: { submittedAt: "asc" },
  });
  const completedAssignments = assignmentSubmissions.length;
  const assignmentDates = assignmentSubmissions.map((s) =>
    s.submittedAt.toISOString()
  );

  // ── Quiz submissions ──────────────────────────────────────────────────────────
  const quizSubmissions = await prisma.quizSubmission.findMany({
    where: { studentId: userId },
    select: { submittedAt: true, obtainedMarks: true },
    orderBy: { submittedAt: "asc" },
  });
  const completedQuizzes = quizSubmissions.length;
  const quizDates = quizSubmissions.map((s) => s.submittedAt.toISOString());

  // ── Points & Level (sum of quiz marks) ───────────────────────────────────────
  const points = quizSubmissions.reduce((sum, s) => sum + (s.obtainedMarks ?? 0), 0);
  const level = Math.floor(points / 50) + 1; // 1 level per 50 points, starting at 1

  // ── Login activity (from notifications) ───────────────────────────────────────
  const loginNotifications = await prisma.notification.findMany({
    where: { userId, type: "LOGIN" },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const loginDates = loginNotifications.map((n) => n.createdAt.toISOString());

  return (
    <StudentProgressClient
      totalEnrolled={totalEnrolled}
      completedCourses={completedCourses}
      estimatedCompletedModules={estimatedCompletedModules}
      completedAssignments={completedAssignments}
      completedQuizzes={completedQuizzes}
      loginDates={loginDates}
      quizSubmissionDates={quizDates}
      assignmentSubmissionDates={assignmentDates}
      courses={courses}
      points={points}
      level={level}
    />
  );
}
