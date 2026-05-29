import { prisma } from "@/lib/prisma";
import { getAdminContext } from "../_lib";
import { Card } from "@/components/ui/card";
import { FolderKanban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAllCoursesPage() {
  const ctx = await getAdminContext();

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

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Course</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Instructor</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Enrolled</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">{c.title}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{c.creator?.name || "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{c._count.enrollments}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      c.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {c.published ? "Published" : "Draft"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {courses.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">No courses found.</div>
        )}
      </Card>
    </div>
  );
}
