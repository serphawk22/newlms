"use client";

import { motion } from "framer-motion";
import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronDown, ChevronUp, Download } from "lucide-react";
import type { StudentRow } from "./page";

function csvEscape(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

function toCSV(rows: StudentRow[]): string {
  const header = "Name,Email,Courses,Quiz Avg (%),Enrolled";
  const lines = rows.map((r) =>
    [
      csvEscape(r.name || "Unnamed"),
      csvEscape(r.email),
      csvEscape(r.courses.map(c => c.title).join("; ")),
      r.quizAvg !== null ? r.quizAvg.toFixed(1) : "N/A",
      r.enrolledAt.slice(0, 10),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

interface StudentDetailProps {
  student: StudentRow;
}

function StudentDetail({ student }: StudentDetailProps) {
  const avgProgress = student.courses.reduce((sum, c) => sum + c.progress, 0) / student.courses.length;

  return (
    <div
      style={{ background: "var(--secondary-background)", borderTop: "1px solid var(--border)" }}
      className="px-6 py-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Quiz Avg</span>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>
            {student.quizAvg !== null ? `${student.quizAvg.toFixed(1)}%` : "N/A"}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>First Enrolled</span>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>
            {student.enrolledAt.slice(0, 10)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: "var(--muted-foreground)" }}>Enrolled Courses</span>
        <div className="space-y-2">
          {student.courses.map((course) => (
            <div key={course.id} className="flex items-center gap-3">
              <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{course.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Props {
  students: StudentRow[];
}

export function StudentsPageClient({ students }: Props) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (search && !s.name?.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [students, search]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page space-y-6"
    >
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>My Students</h1>
        <span
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          {filtered.length} students
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "var(--secondary-background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            className="pl-9 focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
          />
        </div>
        <Button
          style={{
            background: "var(--secondary-background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
          className="hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A] font-semibold transition-colors"
          onClick={() => {
            const blob = new Blob([toCSV(filtered)], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "students.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card
        className="overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                <th className="px-4 py-3 w-8" />
                {["Name", "Email", "Enrolled In", "Courses", "Quiz Avg"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const rowKey = s.id;
                return (
                  <Fragment key={rowKey}>
                    <tr
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onClick={() => toggleExpand(rowKey)}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-4 py-3">
                        {expanded.has(rowKey) ? (
                          <ChevronUp className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                        ) : (
                          <ChevronDown className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{s.name || "Unnamed"}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{s.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.courses.map((c) => (
                            <span
                              key={c.id}
                              className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border"
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                borderColor: "var(--border)",
                                color: "var(--foreground)",
                              }}
                            >
                              {c.title}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{s.courses.length}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>
                        {s.quizAvg !== null ? `${s.quizAvg.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                    {expanded.has(rowKey) && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <StudentDetail student={s} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border)" }} />
            No students found matching your filters.
          </div>
        )}
      </Card>
    </motion.div>
  );
}
