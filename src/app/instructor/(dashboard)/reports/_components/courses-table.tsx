"use client";

import { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Download, Search } from "lucide-react";

export interface CourseRow {
  id: string;
  name: string;
  enrolled: number;
  completed: number;
  completionPct: number;
  avgScore: number;
  createdDate: string;
  status: "Published" | "Draft" | "Archived";
  students: { id: string; name: string | null; email: string; progress: number }[];
}

interface CoursesTableProps {
  courses: CourseRow[];
}

export function CoursesTable({ courses }: CoursesTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"All" | "Published" | "Draft" | "Archived">("All");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const perPage = 10;

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      const bySearch = course.name.toLowerCase().includes(search.toLowerCase());
      const byStatus = status === "All" ? true : course.status === status;
      return bySearch && byStatus;
    });
  }, [courses, search, status]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageRows = filtered.slice(page * perPage, (page + 1) * perPage);

  const statusClass = (value: CourseRow["status"]) => {
    if (value === "Published") return "bg-green-100 text-green-600";
    if (value === "Draft") return "bg-amber-100 text-amber-500";
    return "bg-zinc-200 text-zinc-600";
  };

  const exportCSV = () => {
    const header = "Course,Enrolled,Completed,Completion %,Avg Score,Created Date,Status";
    const rows = filtered.map((course) =>
      `"${course.name}",${course.enrolled},${course.completed},${course.completionPct},${course.avgScore},"${course.createdDate}","${course.status}"`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "courses-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search courses..."
            className="w-full h-10 pl-9 pr-3 text-sm border border-zinc-200 rounded-lg bg-white"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "All" || value === "Published" || value === "Draft" || value === "Archived") {
              setStatus(value);
            }
            setPage(0);
          }}
          className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-white"
        >
          <option>All</option>
          <option>Published</option>
          <option>Draft</option>
          <option>Archived</option>
        </select>
        <button
          onClick={exportCSV}
          data-export-csv
          className="inline-flex items-center gap-2 h-10 px-3 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <Card className="border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Course name</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Category</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">Enrolled</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">Completed</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Completion %</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">Avg Score</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Created</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pageRows.map((course) => (
                <Fragment key={course.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setExpanded(expanded === course.id ? null : course.id)}
                    className="hover:bg-zinc-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-zinc-900 font-medium">{course.name}</td>
                    <td className="px-4 py-3 text-zinc-400">N/A</td>
                    <td className="px-4 py-3 text-center text-zinc-900">{course.enrolled}</td>
                    <td className="px-4 py-3 text-center text-zinc-900">{course.completed}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-zinc-100 rounded-full w-28 overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${course.completionPct}%` }} />
                        </div>
                        <span className="text-xs text-zinc-600">{course.completionPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-900">{course.avgScore}%</td>
                    <td className="px-4 py-3 text-zinc-600">{course.createdDate}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusClass(course.status)}`}>
                        {course.status}
                      </span>
                    </td>
                  </motion.tr>
                  {expanded === course.id && (
                    <tr className="bg-zinc-50/60">
                      <td colSpan={8} className="px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Enrolled Students</p>
                        {course.students.length === 0 ? (
                          <p className="text-sm text-zinc-400">No enrolled students.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {course.students.map((student) => (
                              <div key={student.id} className="flex items-center justify-between text-sm">
                                <span className="text-zinc-600">{student.name || student.email}</span>
                                <span className="text-zinc-900">{Math.round(student.progress)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">No courses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
