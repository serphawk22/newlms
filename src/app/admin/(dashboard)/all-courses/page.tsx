import { prisma } from "@/lib/prisma";
import { getAdminContext } from "../_lib";
import { Card } from "@/components/ui/card";
import { FolderKanban } from "lucide-react";
import { CoursesClient } from "./courses-client";

export const dynamic = "force-dynamic";

export default async function AdminAllCoursesPage({
  searchParams,
}: {
  searchParams?: { published?: string };
}) {
  const ctx = await getAdminContext();
  const filterPublished = searchParams?.published === "true";

  const courses = await prisma.course.findMany({
    where: { organizationId: ctx.orgId },
    include: {
      creator: { select: { name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { id: "desc" },
  });

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center gap-2">
        <FolderKanban className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">All Courses</h1>
        <span className="ml-auto text-xs font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
          {courses.length} courses
        </span>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white">
        <CoursesClient courses={courses} defaultPublished={filterPublished} />
        {courses.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">No courses found.</div>
        )}
      </Card>
    </div>
  );
}
