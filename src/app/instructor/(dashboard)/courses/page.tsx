import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, PlusCircle, Settings } from "lucide-react";
import { getDashboardContext } from "../_lib";

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
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Course Library</h1>
        <span className="ml-auto text-xs font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
          {courses.length} courses total
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create new course card */}
        <Card className="border-dashed border-2 border-zinc-200 bg-zinc-50/50 shadow-none flex flex-col justify-center min-h-[220px] transition-colors hover:bg-zinc-50 hover:border-zinc-300">
          <CardContent className="pt-6 flex flex-col h-full">
            <form action={createCourse} className="space-y-4 my-auto">
              <input type="hidden" name="orgId" value={ctx.orgId} />
              <input type="hidden" name="creatorId" value={ctx.userId} />
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-600 font-semibold text-xs uppercase tracking-wider">
                  New Course
                </Label>
                <Input id="title" name="title" required placeholder="Enter course title..." className="bg-white border-zinc-200 focus-visible:ring-zinc-900" />
              </div>
              <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-sm">
                <PlusCircle className="w-4 h-4 mr-2" /> Create Course
              </Button>
            </form>
          </CardContent>
        </Card>

        {courses.map((course) => (
          <div key={course.id}>
          <Card className="border-zinc-200 shadow-sm flex flex-col hover:border-zinc-300 hover:shadow-md transition-all duration-200 group">
            <CardHeader className="pb-3 border-b border-zinc-100 bg-white rounded-t-xl">
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base leading-tight font-bold text-zinc-900 group-hover:text-violet-700 transition-colors line-clamp-2">
                    {course.title}
                  </CardTitle>
                  <p className="text-[10px] text-zinc-500 font-medium">By {course.creator?.name || "Unknown"}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md whitespace-nowrap uppercase tracking-wider shrink-0 ${
                  course.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {course.published ? "Published" : "Draft"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 p-0">
              <div className="grid grid-cols-2 gap-px bg-zinc-100 p-4 flex-1 content-start">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Students</span>
                  <span className="text-sm font-black text-zinc-700">{course._count.enrollments}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Modules</span>
                  <span className="text-sm font-black text-zinc-700">{course._count.modules}</span>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quizzes</span>
                  <span className="text-sm font-black text-zinc-700">{course._count.quizzes}</span>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Assignments</span>
                  <span className="text-sm font-black text-zinc-700">{course._count.assignments}</span>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 rounded-b-xl border-t border-zinc-100 mt-auto">
                <Link href={`/instructor/courses/${course.id}`}>
                  <Button className="w-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 font-bold text-sm shadow-sm transition-all group-hover:border-zinc-300">
                    <Settings className="w-4 h-4 mr-2" /> Manage Content
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
