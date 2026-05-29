import { prisma } from "@/lib/prisma";
import { getDashboardContext } from "../_lib";
import { AssignmentsPageClient } from "./assignments-client";

export const dynamic = "force-dynamic";

export interface AssignmentRow {
  id: string;
  title: string;
  courseTitle: string;
  courseId: string;
  createdAt: string;
  submissions: number;
  totalStudents: number;
}

export default async function AssignmentsPage() {
  const ctx = await getDashboardContext();

  const assignments = await prisma.assignment.findMany({
    where: { course: { creatorId: ctx.userId, organizationId: ctx.orgId } },
    include: {
      course: { select: { id: true, title: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { id: "desc" },
  });

  const courseIds = assignments.map((a) => a.courseId);

  const enrollmentCounts = await prisma.enrollment.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIds } },
    _count: { id: true },
  });
  const enrollmentMap = new Map(enrollmentCounts.map((e) => [e.courseId, e._count.id]));

  const rows: AssignmentRow[] = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    courseTitle: a.course.title,
    courseId: a.course.id,
    createdAt: a.createdAt.toISOString(),
    submissions: a._count.submissions,
    totalStudents: enrollmentMap.get(a.course.id) || 0,
  }));

  return <AssignmentsPageClient assignments={rows} />;
}
