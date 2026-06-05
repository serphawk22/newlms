"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

export interface ActivityRow {
  id: string;
  studentName: string;
  lessonName: string;
  status: "Viewed" | "Not viewed";
  timeSpent: string;
  lastAccessed: string;
  attempts: number;
  courseId: string;
  moduleId: string;
}

interface ActivityFilters {
  courses: { id: string; title: string }[];
  modules: { id: string; title: string; courseId: string }[];
  lessons: { id: string; title: string; moduleId: string }[];
}

interface LearningActivitiesTableProps {
  rows: ActivityRow[];
  filters: ActivityFilters;
  summary: { today: number; week: number; month: number };
}

export function LearningActivitiesTable({ rows, filters, summary }: LearningActivitiesTableProps) {
  const [courseId, setCourseId] = useState("all");
  const [moduleId, setModuleId] = useState("all");
  const [lessonId, setLessonId] = useState("all");
  const [page, setPage] = useState(0);
  const perPage = 10;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (courseId !== "all" && row.courseId !== courseId) return false;
      if (moduleId !== "all" && row.moduleId !== moduleId) return false;
      // Note: lesson filtering disabled - MaterialView doesn't track lessonId
      // if (lessonId !== "all" && row.id !== lessonId) return false;
      return true;
    });
  }, [rows, courseId, moduleId, lessonId]);

  const visible = filteredRows.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filteredRows.length / perPage);

  const filteredModules = filters.modules.filter((module) => courseId === "all" || module.courseId === courseId);
  const filteredLessons = filters.lessons.filter((lesson) => moduleId === "all" || lesson.moduleId === moduleId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setModuleId("all");
            setLessonId("all");
            setPage(0);
          }}
          className="h-10 px-3 border border-zinc-200 rounded-lg text-sm bg-white"
        >
          <option value="all">All Courses</option>
          {filters.courses.map((course) => (
            <option value={course.id} key={course.id}>{course.title}</option>
          ))}
        </select>
        <select
          value={moduleId}
          onChange={(e) => {
            setModuleId(e.target.value);
            setLessonId("all");
            setPage(0);
          }}
          className="h-10 px-3 border border-zinc-200 rounded-lg text-sm bg-white"
        >
          <option value="all">All Modules</option>
          {filteredModules.map((module) => (
            <option value={module.id} key={module.id}>{module.title}</option>
          ))}
        </select>
        <select
          value={lessonId}
          onChange={(e) => {
            setLessonId(e.target.value);
            setPage(0);
          }}
          className="h-10 px-3 border border-zinc-200 rounded-lg text-sm bg-white"
        >
          <option value="all">All Lessons</option>
          {filteredLessons.map((lesson) => (
            <option value={lesson.id} key={lesson.id}>{lesson.title}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total views today", value: summary.today },
          { label: "This week", value: summary.week },
          { label: "This month", value: summary.month },
        ].map((item) => (
          <Card key={item.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">{item.label}</p>
            <p className="text-2xl font-medium text-zinc-900 mt-1">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Student</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Lesson</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Time spent</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Last accessed</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.id}-${row.studentName}`} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{row.studentName}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{row.lessonName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${row.status === "Viewed" ? "bg-green-100 text-green-600" : "bg-zinc-200 text-zinc-600"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{row.timeSpent}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{row.lastAccessed}</td>
                  <td className="px-4 py-3 text-center text-sm" style={{ color: "var(--foreground)" }}>{row.attempts}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No activity found.</td>
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
