"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FolderKanban, Search } from "lucide-react";
import type { AllCoursesData, CourseRow } from "./page";

interface Props {
  data: AllCoursesData;
}

const ITEMS_PER_PAGE = 15;

function CourseRowComponent({ course }: { course: CourseRow }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 truncate">{course.title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{course.instructorName || "Unknown"}</p>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-900">{course.enrolledStudents}</p>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Students</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-900">{course.completionRate}%</p>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Completed</p>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
          course.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}>
          {course.published ? "Published" : "Draft"}
        </span>
      </div>
    </div>
  );
}

export function AllCoursesPageClient({ data }: Props) {
  const [search, setSearch] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return data.courses.filter((c) => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (instructorFilter && c.instructorId !== instructorFilter) return false;
      if (statusFilter === "published" && !c.published) return false;
      if (statusFilter === "draft" && c.published) return false;
      return true;
    });
  }, [data.courses, search, instructorFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center gap-2">
        <FolderKanban className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">All Courses</h1>
        <span className="ml-auto text-xs font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
          {data.total} courses
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by course name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 border-zinc-200"
          />
        </div>
        <select
          value={instructorFilter}
          onChange={(e) => { setInstructorFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All Instructors</option>
          {data.instructors.map((inst) => (
            <option key={inst.id} value={inst.id}>{inst.name || "Unnamed"}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-100">
          {paged.map((c) => (
            <CourseRowComponent key={c.id} course={c} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">No courses found matching your filters.</div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">{filtered.length} courses</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium text-zinc-500 disabled:opacity-40 hover:text-zinc-900 border border-zinc-200 rounded-lg"
            >
              Previous
            </button>
            <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium text-zinc-500 disabled:opacity-40 hover:text-zinc-900 border border-zinc-200 rounded-lg"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
