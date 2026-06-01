"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import {
  BookOpen, CheckCircle2, FileText, HelpCircle,
  Trophy, Star, BarChart3, BookMarked,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  progress: number;
  moduleCount: number;
}

interface Props {
  totalEnrolled: number;
  completedCourses: number;
  estimatedCompletedModules: number;
  completedAssignments: number;
  completedQuizzes: number;
  loginDates: string[];
  quizSubmissionDates: string[];
  assignmentSubmissionDates: string[];
  courses: Course[];
  points: number;
  level: number;
}

type Period = "Week" | "Month" | "Year";

// ── Activity data builder ─────────────────────────────────────────────────────

function buildChartData(
  period: Period,
  loginDates: string[],
  quizDates: string[],
  assignmentDates: string[]
) {
  const now = new Date();
  const allActivity = [...quizDates, ...assignmentDates];

  if (period === "Week") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const prefix = d.toISOString().split("T")[0];
      return {
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        Logins: loginDates.filter((s) => s.startsWith(prefix)).length,
        Activity: allActivity.filter((s) => s.startsWith(prefix)).length,
      };
    });
  }

  if (period === "Month") {
    // Last 4 weeks
    return Array.from({ length: 4 }, (_, i) => {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const label = `${start.getDate()}/${start.getMonth() + 1}`;
      return {
        label,
        Logins: loginDates.filter((s) => {
          const t = new Date(s).getTime();
          return t >= start.getTime() && t <= end.getTime();
        }).length,
        Activity: allActivity.filter((s) => {
          const t = new Date(s).getTime();
          return t >= start.getTime() && t <= end.getTime();
        }).length,
      };
    }).reverse();
  }

  // Year — 12 months
  return Array.from({ length: 12 }, (_, i) => {
    const y = now.getFullYear();
    const m = now.getMonth() - (11 - i);
    const target = new Date(y, m, 1);
    const yr = target.getFullYear();
    const mo = target.getMonth();
    return {
      label: target.toLocaleDateString("en-US", { month: "short" }),
      Logins: loginDates.filter((s) => {
        const d = new Date(s);
        return d.getFullYear() === yr && d.getMonth() === mo;
      }).length,
      Activity: allActivity.filter((s) => {
        const d = new Date(s);
        return d.getFullYear() === yr && d.getMonth() === mo;
      }).length,
    };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-2 text-gray-400">
      <BookMarked className="w-10 h-10 opacity-30" />
      <p className="text-sm font-medium">{message}</p>
      <a href="/student/courses" className="text-xs text-blue-500 hover:underline">
        Find and add courses from the catalog
      </a>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewCard({
  totalEnrolled, completedCourses, estimatedCompletedModules,
  completedAssignments, completedQuizzes,
}: Pick<Props,
  | "totalEnrolled" | "completedCourses" | "estimatedCompletedModules"
  | "completedAssignments" | "completedQuizzes"
>) {
  const stats = [
    { label: "Enrolled Courses",    value: totalEnrolled,               icon: BookOpen,      color: "text-blue-500",   bg: "bg-blue-50" },
    { label: "Completed Courses",   value: completedCourses,            icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Completed Modules",   value: estimatedCompletedModules,   icon: BookMarked,    color: "text-violet-500", bg: "bg-violet-50" },
    { label: "Completed Assignments", value: completedAssignments,      icon: FileText,      color: "text-amber-500",  bg: "bg-amber-50" },
    { label: "Completed Quizzes",   value: completedQuizzes,            icon: HelpCircle,    color: "text-rose-500",   bg: "bg-rose-50" },
  ];

  if (totalEnrolled === 0 && completedAssignments === 0 && completedQuizzes === 0) {
    return <EmptyState message="No stats to show" />;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 truncate">{label}</p>
            <p className="text-lg font-bold text-gray-800 leading-tight">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Activity ──────────────────────────────────────────────────────────────────

function ActivityCard({
  loginDates, quizSubmissionDates, assignmentSubmissionDates,
}: Pick<Props, "loginDates" | "quizSubmissionDates" | "assignmentSubmissionDates">) {
  const [period, setPeriod] = useState<Period>("Month");

  const data = useMemo(
    () => buildChartData(period, loginDates, quizSubmissionDates, assignmentSubmissionDates),
    [period, loginDates, quizSubmissionDates, assignmentSubmissionDates]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500">Track your engagement over time</span>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
          {(["Week", "Month", "Year"] as Period[]).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              cursor={{ fill: "rgba(99,102,241,0.06)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="Logins"   fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Activity" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Courses ───────────────────────────────────────────────────────────────────

function CoursesCard({ courses }: Pick<Props, "courses">) {
  if (courses.length === 0) {
    return <EmptyState message="No stats to show" />;
  }

  return (
    <div className="space-y-4 overflow-y-auto max-h-[260px] pr-1">
      {courses.map((course) => (
        <div key={course.id}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-gray-800 truncate max-w-[75%]">{course.title}</p>
            <span className={`text-xs font-semibold ${
              course.progress >= 100
                ? "text-emerald-600"
                : course.progress > 0
                ? "text-blue-600"
                : "text-gray-400"
            }`}>
              {course.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                course.progress >= 100
                  ? "bg-emerald-500"
                  : course.progress > 0
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
              style={{ width: `${Math.min(course.progress, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {course.progress >= 100 ? "✓ Completed" : course.progress > 0 ? "In progress" : "Not started"}{" "}
            · {course.moduleCount} module{course.moduleCount !== 1 ? "s" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Achievements ──────────────────────────────────────────────────────────────

function AchievementsCard({ points, level }: Pick<Props, "points" | "level">) {
  const nextLevelPoints = level * 50;
  const progressPct = Math.min(Math.round((points % 50) / 50 * 100), 100);

  return (
    <div className="space-y-6">
      {/* Points */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
          <Star className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Points</p>
          <p className="text-3xl font-bold text-amber-800 leading-none">{points}</p>
        </div>
      </div>

      {/* Level */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-violet-50 border border-violet-100">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-violet-700 font-medium uppercase tracking-wide">Level</p>
          <p className="text-3xl font-bold text-violet-800 leading-none">{level}</p>
        </div>
      </div>

      {/* Progress to next level */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-gray-500 font-medium">Progress to Level {level + 1}</p>
          <p className="text-xs text-gray-500">{points % 50} / 50 pts</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {nextLevelPoints - points} points needed for Level {level + 1}
        </p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function StudentProgressClient(props: Props) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Progress</h1>
          <p className="text-sm text-gray-500">Track your learning journey</p>
        </div>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top-left: Overview */}
        <Card title="Overview">
          <OverviewCard
            totalEnrolled={props.totalEnrolled}
            completedCourses={props.completedCourses}
            estimatedCompletedModules={props.estimatedCompletedModules}
            completedAssignments={props.completedAssignments}
            completedQuizzes={props.completedQuizzes}
          />
        </Card>

        {/* Top-right: Activity */}
        <Card title="Activity">
          <ActivityCard
            loginDates={props.loginDates}
            quizSubmissionDates={props.quizSubmissionDates}
            assignmentSubmissionDates={props.assignmentSubmissionDates}
          />
        </Card>

        {/* Bottom-left: Courses */}
        <Card title="Courses">
          <CoursesCard courses={props.courses} />
        </Card>

        {/* Bottom-right: Achievements */}
        <Card title="Achievements">
          <AchievementsCard points={props.points} level={props.level} />
        </Card>
      </div>
    </div>
  );
}
