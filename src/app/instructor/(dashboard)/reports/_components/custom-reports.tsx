"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";

interface OptionItem {
  id: string;
  label: string;
}

interface ResultRow {
  id: string;
  columns: Record<string, string | number>;
}

interface CustomReportsProps {
  courses: OptionItem[];
  rows: ResultRow[];
}

export function CustomReports({ courses, rows }: CustomReportsProps) {
  const [reportType, setReportType] = useState<"users" | "courses" | "enrollments" | "quiz_results">("users");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [savedName, setSavedName] = useState("");
  const [generated, setGenerated] = useState(false);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const roleValue = typeof row.columns.role === "string" ? row.columns.role : "";
      const statusValue = typeof row.columns.status === "string" ? row.columns.status : "";
      if (role !== "all" && roleValue !== role) return false;
      if (status !== "all" && statusValue !== status) return false;
      return true;
    });
  }, [rows, role, status]);

  const columns = visibleRows[0] ? Object.keys(visibleRows[0].columns) : [];

  const exportCSV = () => {
    if (columns.length === 0) return;
    const header = columns.join(",");
    const body = visibleRows.map((row) => columns.map((key) => `"${String(row.columns[key] ?? "")}"`).join(","));
    const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-${reportType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as "users" | "courses" | "enrollments" | "quiz_results")}
            className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-white"
          >
            <option value="users">Users</option>
            <option value="courses">Courses</option>
            <option value="enrollments">Enrollments</option>
            <option value="quiz_results">Quiz Results</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 px-3 text-sm border border-zinc-200 rounded-lg" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 px-3 text-sm border border-zinc-200 rounded-lg" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-white">
            <option value="all">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-white">
            <option value="all">All Completion Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
          </select>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              setSelectedCourses((prev) => (prev.includes(e.target.value) ? prev : [...prev, e.target.value]));
            }}
            className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-white"
          >
            <option value="">Add Course Filter</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.label}</option>
            ))}
          </select>
          <button
            onClick={() => setGenerated(true)}
            className="h-10 px-4 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
          >
            Generate Report
          </button>
          <div className="flex gap-2">
            <input
              value={savedName}
              onChange={(e) => setSavedName(e.target.value)}
              placeholder="Save config as..."
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg w-full"
            />
            <button className="h-10 px-3 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
              Save
            </button>
          </div>
        </div>
        {selectedCourses.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCourses.map((id) => {
              const course = courses.find((item) => item.id === id);
              if (!course) return null;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedCourses((prev) => prev.filter((value) => value !== id))}
                  className="text-[10px] px-2 py-1 rounded-md bg-zinc-100 text-zinc-600"
                >
                  {course.label} x
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <button
          onClick={exportCSV}
          data-export-csv
          className="inline-flex items-center gap-2 h-10 px-3 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <Card className="overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
        {!generated || visibleRows.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No results</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                  {columns.map((column) => (
                    <th key={column} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                      {column.replaceAll("_", " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    {columns.map((column) => (
                      <td key={`${row.id}-${column}`} className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
                        {String(row.columns[column] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
