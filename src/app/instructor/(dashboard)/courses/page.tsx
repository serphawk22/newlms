import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";
import { getDashboardContext } from "../_lib";
import { CourseCardWithDelete } from "@/components/CourseCardWithDelete";
import { CreateCourseCard } from "@/components/CreateCourseCard";

export const dynamic = "force-dynamic";

export default async function InstructorCoursesPage() {
  const ctx = await getDashboardContext();

  const courses = await prisma.course.findMany({
    where: {
      organizationId: ctx.orgId,
      ...(ctx.role === "INSTRUCTOR" ? { creatorId: ctx.userId } : {}),
    },
    include: {
      creator: { select: { name: true } },
      _count: {
        select: {
          enrollments: true,
          modules: true,
          assignments: true,
          quizzes: true,
        }
      }
    },
    orderBy: { id: "desc" },
  });

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Course Library</h1>
        <span
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          {courses.length} courses total
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create new course card */}
        <CreateCourseCard orgId={ctx.orgId} creatorId={ctx.userId} role={ctx.role} />

        {courses.map((course) => (
          <CourseCardWithDelete key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
