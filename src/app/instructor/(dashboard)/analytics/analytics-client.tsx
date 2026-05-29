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
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Analytics</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Enrollments", value: data.totalEnrollments, icon: Users },
          { label: "Avg Completion", value: `${data.avgCompletion}%`, icon: TrendingUp },
          { label: "Avg Quiz Score", value: `${data.avgQuizScore}%`, icon: Target },
          { label: "Courses", value: data.courses.length, icon: BarChart2 },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-zinc-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-zinc-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-zinc-900">{stat.value}</p>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">Enrollment Trend (12 months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.enrollmentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e4e4e7", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="value" stroke="#18181b" strokeWidth={2} dot={{ r: 3, fill: "#18181b" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-zinc-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">Quiz Performance by Course</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.quizPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="course" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e4e4e7", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="score" fill="#18181b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Students</span>
          {data.courses.length > 0 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="ml-auto px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">All Courses</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.title}>{c.title}</option>
              ))}
            </select>
          )}
        </div>
        <Card className="border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Name</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Email</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Course</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Progress</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Quiz Avg</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{s.name || "Unnamed"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{s.email}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 truncate max-w-[200px]">{s.courseTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${
                        s.progress >= 100 ? "text-emerald-600" : s.progress >= 50 ? "text-amber-600" : "text-zinc-500"
                      }`}>
                        {s.progress.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {s.quizAvg !== null ? `${s.quizAvg.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-sm">No data available.</div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
