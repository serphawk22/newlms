import { prisma } from "@/lib/prisma";
import { getDashboardContext } from "../_lib";
import { AccessDenied } from "@/components/AccessDenied";
import { AllCoursesPageClient } from "./all-courses-client";

export const dynamic = "force-dynamic";

export interface CourseRow {
  id: string;
  title: string;
  instructorName: string | null;
  instructorId: string;
  enrolledStudents: number;
  completionRate: number;
  published: boolean;
}

export interface InstructorOption {
  id: string;
  name: string | null;
}

export interface AllCoursesData {
  courses: CourseRow[];
  instructors: InstructorOption[];
  total: number;
}

export default async function AllCoursesPage() {
  const ctx = await getDashboardContext();

  if (ctx.role !== "ADMIN") {
    return (
      <AccessDenied
        title="Admin Access Required"
        description="This section is only available to administrators"
        buttonLabel="Go back"
        buttonHref="/instructor"
      />
    );
  }

  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { organizationId: ctx.orgId },
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { id: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { course: { organizationId: ctx.orgId } },
      select: { courseId: true, progress: true },
    }),
  ]);

  const completionByCourse = new Map<string, number>();
  const enrollmentCountByCourse = new Map<string, number>();
  for (const e of enrollments) {
    enrollmentCountByCourse.set(e.courseId, (enrollmentCountByCourse.get(e.courseId) || 0) + 1);
    completionByCourse.set(e.courseId, (completionByCourse.get(e.courseId) || 0) + (e.progress >= 100 ? 1 : 0));
  }

  const courseRows: CourseRow[] = courses.map((c) => {
    const total = enrollmentCountByCourse.get(c.id) || 0;
    const completed = completionByCourse.get(c.id) || 0;
    return {
      id: c.id,
      title: c.title,
      instructorName: c.creator?.name || "Unknown",
      instructorId: c.creator.id,
      enrolledStudents: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      published: c.published,
    };
  });

  const instructorIds = [...new Set(courses.map((c) => c.creator.id))];
  const instructors: InstructorOption[] = await prisma.user.findMany({
    where: { id: { in: instructorIds } },
    select: { id: true, name: true },
  });

  const data: AllCoursesData = {
    courses: courseRows,
    instructors,
    total: courseRows.length,
  };

  return <AllCoursesPageClient data={data} />;
}
