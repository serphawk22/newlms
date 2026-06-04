"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen } from "lucide-react";

export interface InstructorRow {
  id: string;
  name: string;
  coursesCreated: number;
  enrolledStudents: number;
  role: string;
}

export interface CourseRow {
  id: string;
  title: string;
  createdBy: string;
  published: boolean;
  enrollmentCount: number;
}

export function AdminInstructorTable({ rows }: { rows: InstructorRow[] }) {
  return (
    <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--foreground)" }}>
          <Users className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> Instructor Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Name</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Courses</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Students</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Role</th>
              </tr>
            </thead>
            <motion.tbody
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-xs" style={{ color: "var(--muted-foreground)" }}>No instructors found</td></tr>
              ) : rows.map((r) => (
                <motion.tr
                  key={r.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-3 px-4 font-semibold" style={{ color: "var(--foreground)" }}>{r.name}</td>
                  <td className="py-3 px-3 text-center font-medium" style={{ color: "var(--foreground)" }}>{r.coursesCreated}</td>
                  <td className="py-3 px-3 text-center font-medium" style={{ color: "var(--foreground)" }}>{r.enrolledStudents}</td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                    >
                      {r.role}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminCourseTable({ rows }: { rows: CourseRow[] }) {
  return (
    <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--foreground)" }}>
          <BookOpen className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> Course Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10" style={{ background: "var(--card)" }}>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Course</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Creator</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Status</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Enrolled</th>
              </tr>
            </thead>
            <motion.tbody
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-xs" style={{ color: "var(--muted-foreground)" }}>No courses found</td></tr>
              ) : rows.map((c) => (
                <motion.tr
                  key={c.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="py-3 px-4 font-semibold max-w-[160px] truncate" style={{ color: "var(--foreground)" }}>{c.title}</td>
                  <td className="py-3 px-3 text-xs" style={{ color: "var(--muted-foreground)" }}>{c.createdBy}</td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={c.published
                        ? { background: "rgba(255,255,255,0.08)", color: "var(--foreground)", border: "1px solid var(--border)" }
                        : { background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                      }
                    >
                      {c.published ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-medium" style={{ color: "var(--foreground)" }}>{c.enrollmentCount}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
