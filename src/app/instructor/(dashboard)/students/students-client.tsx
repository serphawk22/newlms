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
  const progressColor =
    avgProgress >= 100
      ? "text-emerald-600"
      : avgProgress >= 50
        ? "text-amber-600"
        : "text-zinc-500";

  return (
    <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Avg Progress</span>
          <p className={`text-sm font-semibold mt-0.5 ${progressColor}`}>
            {avgProgress.toFixed(1)}%
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quiz Avg</span>
          <p className="text-sm font-semibold mt-0.5 text-zinc-700">
            {student.quizAvg !== null ? `${student.quizAvg.toFixed(1)}%` : "N/A"}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">First Enrolled</span>
          <p className="text-sm font-semibold mt-0.5 text-zinc-700">
            {student.enrolledAt.slice(0, 10)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Course Progress</span>
        <div className="space-y-2">
          {student.courses.map((course) => (
            <div key={course.id} className="flex items-center gap-3">
              <span className="text-xs text-zinc-600 font-medium w-32 truncate">{course.title}</span>
              <div className="flex-1 bg-zinc-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    course.progress >= 100 ? "bg-emerald-500" : course.progress >= 50 ? "bg-amber-500" : "bg-zinc-400"
                  }`}
                  style={{ width: `${Math.min(course.progress, 100)}%` }}
                />
              </div>
              <span className="text-xs text-zinc-600 font-semibold w-12 text-right">{course.progress.toFixed(0)}%</span>
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
        <Users className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">My Students</h1>
        <span className="ml-auto text-xs font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
          {filtered.length} students
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-zinc-200"
          />
        </div>
        <Button
          variant="outline"
          className="border-zinc-200 text-zinc-700"
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

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3 w-8" />
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Name</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Email</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Enrolled In</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Courses</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Quiz Avg</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const rowKey = s.id;
                const avgProgress = s.courses.reduce((sum, c) => sum + c.progress, 0) / s.courses.length;
                return (
                  <Fragment key={rowKey}>
                    <tr
                      className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(rowKey)}
                    >
                      <td className="px-4 py-3">
                        {expanded.has(rowKey) ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">{s.name || "Unnamed"}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{s.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.courses.map((c) => (
                            <span key={c.id} className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded-full">
                              {c.title}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-700">{s.courses.length}</td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
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
          <div className="text-center py-12 text-zinc-400 text-sm">No students found matching your filters.</div>
        )}
      </Card>
    </motion.div>
  );
}
