import { prisma } from "@/lib/prisma";
import { getDashboardContext } from "../_lib";
import { StudentsPageClient } from "./students-client";

export const dynamic = "force-dynamic";

export interface StudentRow {
  id: string;
  name: string | null;
  email: string;
  courses: Array<{ title: string; id: string; progress: number }>;
  enrolledAt: string;
  quizAvg: number | null;
}

export default async function StudentsPage() {
  const ctx = await getDashboardContext();

  // Get ALL ACTIVE enrollments across ALL instructor's courses
  const enrollments = await prisma.enrollment.findMany({
    where: { status: "ACTIVE", course: { creatorId: ctx.userId, organizationId: ctx.orgId } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const userIds = [...new Set(enrollments.map((e) => e.userId))];
  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];

  const quizSubs = await prisma.quizSubmission.findMany({
    where: {
      studentId: { in: userIds },
      quiz: { courseId: { in: courseIds } },
    },
    select: { studentId: true, obtainedMarks: true, totalMarks: true },
  });

  const avgMap = new Map<string, number[]>();
  for (const sub of quizSubs) {
    const arr = avgMap.get(sub.studentId) || [];
    const pct = sub.totalMarks > 0 ? (sub.obtainedMarks / sub.totalMarks) * 100 : 0;
    arr.push(pct);
    avgMap.set(sub.studentId, arr);
  }

  // Group by student — show each student once with all their enrolled courses
  const studentMap = new Map<string, StudentRow>();
  for (const e of enrollments) {
    if (!studentMap.has(e.userId)) {
      studentMap.set(e.userId, {
        id: e.user.id,
        name: e.user.name,
        email: e.user.email,
        courses: [],
        enrolledAt: e.enrolledAt.toISOString(),
        quizAvg: null,
      });
    }
    const student = studentMap.get(e.userId)!;
    student.courses.push({
      title: e.course.title,
      id: e.course.id,
      progress: e.progress,
    });
    // Update earliest enrollment date
    if (e.enrolledAt.toISOString() < student.enrolledAt) {
      student.enrolledAt = e.enrolledAt.toISOString();
    }
  }

  // Calculate quiz average per student
  for (const [userId, student] of studentMap) {
    const scores = avgMap.get(userId);
    if (scores && scores.length > 0) {
      student.quizAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  const students: StudentRow[] = Array.from(studentMap.values());

  return <StudentsPageClient students={students} />;
}
