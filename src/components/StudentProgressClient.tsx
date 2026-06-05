"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";


// Icons are kept only for functional chart legend rendering; decorative usage removed.

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
    <div className="rounded-2xl flex flex-col" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{title}</h2>
      </div>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-2" style={{ color: "var(--muted-foreground)" }}>
      <p className="text-sm font-medium">{message}</p>
      <Link href="/student/courses" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
        Find and add courses from the catalog
      </Link>
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
    { label: "Enrolled Courses",    value: totalEnrolled },
    { label: "Completed Courses",   value: completedCourses },
    { label: "Completed Modules",   value: estimatedCompletedModules },
    { label: "Completed Assignments", value: completedAssignments },
    { label: "Completed Quizzes",   value: completedQuizzes },
  ];

  if (totalEnrolled === 0 && completedAssignments === 0 && completedQuizzes === 0) {
    return <EmptyState message="No stats to show" />;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
          <div className="min-w-0">
            <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{label}</p>
            <p className="text-lg font-bold leading-tight" style={{ color: "var(--foreground)" }}>{value}</p>
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
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Track your engagement over time</span>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="text-xs rounded-lg px-2.5 py-1.5 cursor-pointer"
          style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
        >
          {(["Week", "Month", "Year"] as Period[]).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
              cursor={{ fill: "rgba(217,37,42,0.06)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="Logins"   fill="#D9252A" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Activity" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} maxBarSize={28} />
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
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium truncate max-w-[75%]" style={{ color: "var(--foreground)" }}>{course.title}</p>
            <span className="text-xs font-semibold" style={{
              color: course.progress >= 100 ? "var(--accent)" : course.progress > 0 ? "var(--foreground)" : "var(--muted-foreground)"
            }}>
              {course.progress}%
            </span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
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

  return (
    <div className="space-y-6">
      {/* Points */}
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Points</p>
          <p className="text-3xl font-bold leading-none" style={{ color: "var(--foreground)" }}>{points}</p>
        </div>
      </div>

      {/* Level */}
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Level</p>
          <p className="text-3xl font-bold leading-none" style={{ color: "var(--foreground)" }}>{level}</p>
        </div>
      </div>

      {/* Progress to next level - text only, no visual bar */}
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Progress to Level {level + 1}</p>
        <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          {nextLevelPoints - points} points needed
        </p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function StudentProgressClient(props: Props) {
  return (
    <div className="min-h-screen p-6" style={{ background: "var(--background)" }}>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>My Progress</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Track your learning journey</p>
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
