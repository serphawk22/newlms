import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, PlusCircle } from "lucide-react";
import { getDashboardContext } from "../_lib";
import { CourseCardWithDelete } from "@/components/CourseCardWithDelete";
import { InstructorCoursesClient } from "./instructor-courses-client";
import { triggerCourseCreatedNotifications } from "@/lib/email-notifications-helper";

export const dynamic = "force-dynamic";

async function createCourse(formData: FormData) {
  "use server";
  const title     = (formData.get("title") as string)?.trim();
  const orgId     = (formData.get("orgId") as string)?.trim();
  const creatorId = (formData.get("creatorId") as string)?.trim();
  if (!title || !orgId || !creatorId) return;
  try {
    const course = await prisma.course.create({
      data: { title, organizationId: orgId, creatorId, published: true },
    });
    // Trigger course creation email notifications in background
    triggerCourseCreatedNotifications(course.id).catch((err) =>
      console.error("[createCourse notification error]", err)
    );
    revalidatePath("/instructor/courses");
    redirect(`/instructor/courses/${course.id}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
  }
}

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
      <div className="flex items-center gap-2 flex-wrap">
        <BookOpen className="w-5 h-5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Course Library</h1>
        <span
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          {courses.length} courses total
        </span>
      </div>

      <InstructorCoursesClient courseTitles={courses.map(c => c.title)}>
        {/* Create new course card */}
        <Card data-course-title=""
          style={{
            border: "2px dashed var(--border)",
            background: "rgba(255,255,255,0.02)",
            boxShadow: "none",
          }}
          className="flex flex-col justify-center min-h-[220px] transition-colors hover:bg-[rgba(217,37,42,0.04)] hover:border-[#D9252A] group"
        >
          <CardContent className="pt-6 flex flex-col h-full">
            <form action={createCourse} className="space-y-4 my-auto">
              <input type="hidden" name="orgId" value={ctx.orgId} />
              <input type="hidden" name="creatorId" value={ctx.userId} />
              <div className="space-y-2">
                <Label htmlFor="title" className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  New Course
                </Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="Enter course title..."
                  style={{
                    background: "var(--secondary-background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <Button
                type="submit"
                style={{
                  background: "#D9252A",
                  color: "#FFFFFF",
                }}
                className="w-full hover:bg-[#C21F24] transition-colors shadow-sm font-semibold"
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Create Course
              </Button>
            </form>
          </CardContent>
        </Card>

        {courses.map((course) => (
          <div key={course.id} data-course-title={course.title}>
            <CourseCardWithDelete course={course} />
          </div>
        ))}
      </InstructorCoursesClient>
    </div>
  );
}
