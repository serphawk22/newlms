"use client";

import { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";

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

  const statusStyle = (value: CourseRow["status"]): React.CSSProperties => {
    if (value === "Published") return { background: "rgba(217,37,42,0.08)", color: "#D9252A" };
    if (value === "Draft") return { background: "var(--muted)", color: "var(--muted-foreground)" };
    return { background: "var(--muted)", color: "var(--muted-foreground)" };
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
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search courses..." className="max-w-xs min-w-[220px]" />
        <select
          value={status}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "All" || value === "Published" || value === "Draft" || value === "Archived") {
              setStatus(value);
            }
            setPage(0);
          }}
          className="h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D9252A]"
          style={{ border: "1px solid var(--border)", background: "var(--secondary-background)", color: "var(--foreground)" }}
        >
          <option>All</option>
          <option>Published</option>
          <option>Draft</option>
          <option>Archived</option>
        </select>
        <button
          onClick={exportCSV}
          data-export-csv
          className="inline-flex items-center gap-2 h-10 px-3 text-xs font-medium rounded-lg transition-colors"
          style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", background: "var(--secondary-background)" }}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <Card className="overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Course name</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Category</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Enrolled</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Completed</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Completion %</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Avg Score</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Created</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Status</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: "var(--border)" }}>
              {pageRows.map((course) => (
                <Fragment key={course.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setExpanded(expanded === course.id ? null : course.id)}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--foreground)" }}>{course.name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>N/A</td>
                    <td className="px-4 py-3 text-center text-sm" style={{ color: "var(--foreground)" }}>{course.enrolled}</td>
                    <td className="px-4 py-3 text-center text-sm" style={{ color: "var(--foreground)" }}>{course.completed}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{course.completionPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm" style={{ color: "var(--foreground)" }}>{course.avgScore}%</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{course.createdDate}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={statusStyle(course.status)}>
                        {course.status}
                      </span>
                    </td>
                  </motion.tr>
                  {expanded === course.id && (
                    <tr style={{ background: "var(--secondary-background)" }}>
                      <td colSpan={8} className="px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Enrolled Students</p>
                        {course.students.length === 0 ? (
                          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No enrolled students.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {course.students.map((student) => (
                              <div key={student.id} className="flex items-center text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                                <span style={{ color: "var(--foreground)" }}>{student.name || student.email}</span>
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
                  <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No courses found.</td>
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
            className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", background: "var(--secondary-background)" }}
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", background: "var(--secondary-background)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
