import { prisma } from "@/lib/prisma";
import { getDashboardContext } from "../_lib";
import { AnalyticsPageClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export interface CourseOption {
  id: string;
  title: string;
}

export interface EnrollTrend {
  label: string;
  value: number;
}

export interface QuizPerf {
  course: string;
  score: number;
}

export interface StudentAnalytic {
  id: string;
  name: string | null;
  email: string;
  courseTitle: string;
  progress: number;
  quizAvg: number | null;
}

export interface AnalyticsData {
  courses: CourseOption[];
  enrollmentTrends: EnrollTrend[];
  quizPerformance: QuizPerf[];
  totalEnrollments: number;
  avgCompletion: number;
  avgQuizScore: number;
  students: StudentAnalytic[];
}

export default async function AnalyticsPage() {
  const ctx = await getDashboardContext();

  const courses = await prisma.course.findMany({
    where: { creatorId: ctx.userId, organizationId: ctx.orgId },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const courseIds = courses.map((c) => c.id);

  const [enrollments, quizSubs] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      select: { progress: true, enrolledAt: true, userId: true, courseId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.quizSubmission.findMany({
      where: { quiz: { courseId: { in: courseIds } } },
      select: { obtainedMarks: true, totalMarks: true, studentId: true, quiz: { select: { courseId: true, course: { select: { title: true } } } } },
    }),
  ]);

  const now = new Date();
  const monthLabels = Array.from({ length: 12 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const enrollmentTrends: EnrollTrend[] = monthLabels.map((label) => ({
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

  const quizPerformance: QuizPerf[] = Array.from(quizPerformanceMap.entries()).map(([course, entry]) => ({
    course: course.length > 10 ? `${course.slice(0, 10)}...` : course,
    score: Math.round(entry.total / entry.count),
  }));

  const studentMap = new Map<string, { name: string | null; email: string; courseTitle: string; progress: number; quizScores: number[] }>();
  for (const e of enrollments) {
    const key = e.userId + e.courseId;
    studentMap.set(key, {
      name: e.user.name,
      email: e.user.email,
      courseTitle: courses.find((c) => c.id === e.courseId)?.title || "Unknown",
      progress: e.progress,
      quizScores: [],
    });
  }
  for (const sub of quizSubs) {
    const key = sub.studentId + sub.quiz.courseId;
    const s = studentMap.get(key);
    if (s) {
      const pct = sub.totalMarks > 0 ? (sub.obtainedMarks / sub.totalMarks) * 100 : 0;
      s.quizScores.push(pct);
    }
  }

  const students: StudentAnalytic[] = Array.from(studentMap.entries()).map(([key, s]) => ({
    id: key,
    name: s.name,
    email: s.email,
    courseTitle: s.courseTitle,
    progress: s.progress,
    quizAvg: s.quizScores.length > 0 ? s.quizScores.reduce((a, b) => a + b, 0) / s.quizScores.length : null,
  }));

  const totalEnrollments = enrollments.length;
  const avgCompletion = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length)
    : 0;
  const avgQuizScore = quizSubs.length > 0
    ? Math.round(quizSubs.reduce((sum, s) => {
        const max = s.totalMarks || 1;
        return sum + (s.obtainedMarks / max) * 100;
      }, 0) / quizSubs.length)
    : 0;

  const data: AnalyticsData = {
    courses: courses.map((c) => ({ id: c.id, title: c.title })),
    enrollmentTrends,
    quizPerformance,
    totalEnrollments,
    avgCompletion,
    avgQuizScore,
    students,
  };

  return <AnalyticsPageClient data={data} />;
}
