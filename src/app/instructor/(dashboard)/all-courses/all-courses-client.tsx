"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { FolderKanban } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import type { AllCoursesData, CourseRow } from "./page";

interface Props {
  data: AllCoursesData;
}

const ITEMS_PER_PAGE = 15;

function CourseRowComponent({ course }: { course: CourseRow }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{course.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{course.instructorName || "Unknown"}</p>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{course.enrolledStudents}</p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Students</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{course.completionRate}%</p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Completed</p>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
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
      <div className="flex items-center gap-2 flex-wrap">
        <FolderKanban className="w-5 h-5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>All Courses</h1>
        <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
          {data.total} courses
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by course name..." className="flex-1" />
        <select
          value={instructorFilter}
          onChange={(e) => { setInstructorFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <option value="">All Instructors</option>
          {data.instructors.map((inst) => (
            <option key={inst.id} value={inst.id}>{inst.name || "Unnamed"}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <Card className="overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {paged.map((c) => (
            <CourseRowComponent key={c.id} course={c} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>No courses found matching your filters.</div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{filtered.length} courses</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium disabled:opacity-40 rounded-lg"
              style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)", background: "var(--secondary-background)" }}
            >
              Previous
            </button>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium disabled:opacity-40 rounded-lg"
              style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)", background: "var(--secondary-background)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
