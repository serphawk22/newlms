"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { BarChart2, TrendingUp, Users, Target, Filter } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { AnalyticsData } from "./page";

interface Props {
  data: AnalyticsData;
}

export function AnalyticsPageClient({ data }: Props) {
  const [courseFilter, setCourseFilter] = useState("");

  const filteredStudents = useMemo(() => {
    if (!courseFilter) return data.students;
    return data.students.filter((s) => s.courseTitle === courseFilter);
  }, [data.students, courseFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Analytics</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Enrollments", value: data.totalEnrollments, icon: Users },
          { label: "Avg Completion", value: `${data.avgCompletion}%`, icon: TrendingUp },
          { label: "Avg Quiz Score", value: `${data.avgQuizScore}%`, icon: Target },
          { label: "Courses", value: data.courses.length, icon: BarChart2 },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="p-4"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
                >
                  <Icon className="w-4 h-4" style={{ color: "var(--foreground)" }} />
                </div>
                <div>
                  <p className="text-lg font-medium" style={{ color: "var(--foreground)" }}>{stat.value}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <Card
          className="p-5"
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Enrollment Trend (12 months)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.enrollmentTrends}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                  itemStyle={{ color: "var(--muted-foreground)" }}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#D9252A"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#D9252A", stroke: "#D9252A" }}
                  activeDot={{ r: 6, fill: "#D9252A", stroke: "var(--card)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quiz Performance */}
        <Card
          className="p-5"
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Quiz Performance by Course
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.quizPerformance}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" strokeOpacity={0.7} />
                <XAxis dataKey="course" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                  itemStyle={{ color: "var(--muted-foreground)" }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="score" fill="#D9252A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Students Table */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Students</span>
          {data.courses.length > 0 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="ml-auto px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#D9252A]"
              style={{
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              <option value="">All Courses</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.title}>{c.title}</option>
              ))}
            </select>
          )}
        </div>

        <Card
          className="overflow-hidden"
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                  {["Name", "Email", "Course", "Progress", "Quiz Avg"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.name || "Unnamed"}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{s.email}</td>
                    <td className="px-4 py-3 text-sm truncate max-w-[200px]" style={{ color: "var(--foreground)" }}>{s.courseTitle}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: s.progress >= 100 ? "#D9252A" : s.progress >= 50 ? "var(--foreground)" : "var(--muted-foreground)" }}
                      >
                        {s.progress.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>
                      {s.quizAvg !== null ? `${s.quizAvg.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>No data available.</div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
