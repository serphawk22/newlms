"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";

export interface MatrixStudent {
  id: string;
  name: string;
  statuses: Record<string, "completed" | "in_progress" | "not_started" | "not_enrolled">;
}

export interface MatrixCourse {
  id: string;
  title: string;
}

interface TrainingMatrixProps {
  students: MatrixStudent[];
  courses: MatrixCourse[];
}

export function TrainingMatrix({ students, courses }: TrainingMatrixProps) {
  const [query, setQuery] = useState("");

  const filteredStudents = useMemo(
    () => students.filter((student) => student.name.toLowerCase().includes(query.toLowerCase())),
    [students, query]
  );

  const statusSymbol = (status: MatrixStudent["statuses"][string]) => {
    if (status === "completed") return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">✓</span>;
    if (status === "in_progress") return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-500">⏳</span>;
    if (status === "not_started") return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 text-zinc-600">○</span>;
    return <span className="text-zinc-400">—</span>;
  };

  const exportCSV = () => {
    const header = ["Student", ...courses.map((course) => course.title)].join(",");
    const rows = filteredStudents.map((student) => {
      const values = courses.map((course) => student.statuses[course.id] || "not_enrolled");
      return [`"${student.name}"`, ...values].join(",");
    });
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "training-matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xs text-zinc-600 flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-green-600 rounded-full" /> Completed</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> In Progress</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-zinc-400 rounded-full" /> Not Started</span>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter students..."
          className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-white ml-auto"
        />
        <button
          onClick={exportCSV}
          data-export-csv
          className="inline-flex items-center gap-2 h-10 px-3 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <Card className="overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                <th className="sticky left-0 z-20 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest w-56" style={{ color: "var(--muted-foreground)", background: "var(--card)" }}>
                  Student
                </th>
                {courses.map((course) => (
                  <th key={course.id} className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                    {course.title.length > 20 ? `${course.title.slice(0, 20)}...` : course.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td className="sticky left-0 px-4 py-3 text-sm font-medium z-10" style={{ color: "var(--foreground)", background: "var(--card)" }}>{student.name}</td>
                  {courses.map((course) => (
                    <td key={`${student.id}-${course.id}`} className="px-4 py-3 text-center">
                      {statusSymbol(student.statuses[course.id] || "not_enrolled")}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={courses.length + 1} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
