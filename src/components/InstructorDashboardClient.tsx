"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Users, BookOpen, HelpCircle, ClipboardList, TrendingUp,
  CalendarDays, ChevronRight, PlusCircle, ArrowRight,
  Clock, Video, ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth,
  isToday, getDay, subMonths, addMonths,
} from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardItem: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "easeOut", duration: 0.3 } },
};

const fadeUp: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "easeOut", duration: 0.4 } },
};

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-2xl font-medium"
      style={{ color: "var(--foreground)" }}
    >
      {value}{suffix}
    </motion.span>
  );
}

function MiniCalendar({ sessionDates }: { sessionDates: string[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const startDay = getDay(startOfMonth(currentMonth));

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 rounded-lg transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm" style={{ color: "var(--foreground)", fontWeight: 600 }}>
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 rounded-lg transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span
            key={d}
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const hasSession = sessionDates.some((d) => isSameDay(new Date(d), day));
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className="relative flex items-center justify-center h-8 w-full rounded-lg text-xs font-medium transition-colors"
              style={
                today
                  ? { background: "#D9252A", color: "#FFFFFF" }
                  : { color: "var(--foreground)" }
              }
              onMouseEnter={e => {
                if (!today) (e.currentTarget as HTMLDivElement).style.background = "var(--muted)";
              }}
              onMouseLeave={e => {
                if (!today) (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              {format(day, "d")}
              {hasSession && !today && (
                <span
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: "#D9252A" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  greeting: string;
  userName: string;
  totalCourses: number;
  totalStudents: number;
  activeQuizzes: number;
  pendingAssignments: number;
  allQuizzes: { id: string; title: string; courseTitle: string; questionCount: number }[];
  allLiveSessions: { id: string; title: string; scheduledAt: string; status: string; roomId: string; courseTitle: string }[];
  enrollCounts: number[];
  weekDays: string[];
  monthLabels: string[];
  monthCounts: number[];
}

export function InstructorDashboardClient({
  greeting, userName, totalCourses, totalStudents,
  activeQuizzes, pendingAssignments,
  allQuizzes, allLiveSessions, enrollCounts, weekDays, monthLabels, monthCounts,
}: Props) {
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");

  const stats = [
    { label: "Total Students", value: totalStudents, suffix: "+", icon: Users },
    { label: "Total Courses", value: totalCourses, suffix: "+", icon: BookOpen },
    { label: "Active Quizzes", value: activeQuizzes, suffix: "", icon: HelpCircle },
    { label: "Pending Assignments", value: pendingAssignments, suffix: "", icon: ClipboardList },
  ];

  const chartData = chartView === "weekly"
    ? weekDays.map((day, i) => ({
        day: format(new Date(day), "EEE"),
        Enrollments: enrollCounts[i],
      }))
    : monthLabels.map((label, i) => ({
        day: label,
        Enrollments: monthCounts[i],
      }));

  const sessionDates = allLiveSessions.map((s) => s.scheduledAt);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium" style={{ color: "var(--foreground)" }}>
            {greeting}, {userName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Here&apos;s what&apos;s happening with your courses today.</p>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={cardItem}>
            <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
                  >
                    <stat.icon className="w-5 h-5" style={{ color: "var(--foreground)" } as React.CSSProperties} />
                  </div>
                  <TrendingUp className="w-4 h-4" style={{ color: "#D9252A" }} />
                </div>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                <p className="text-xs font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Calendar + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: "easeOut", duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Schedule</h3>
          </div>
          <MiniCalendar sessionDates={sessionDates} />
        </motion.div>

        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ease: "easeOut", duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Course Performance</h3>
            </div>
            <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "var(--muted)" }}>
              <button
                onClick={() => setChartView("weekly")}
                style={chartView === "weekly"
                  ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                  : { color: "var(--muted-foreground)" }
                }
                className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              >
                Weekly
              </button>
              <button
                onClick={() => setChartView("monthly")}
                style={chartView === "monthly"
                  ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                  : { color: "var(--muted-foreground)" }
                }
                className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              >
                Monthly
              </button>
            </div>
          </div>
          <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
            <CardContent className="p-4 sm:p-6">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke="var(--border)"
                      strokeOpacity={0.7}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        fontSize: "12px",
                        color: "var(--foreground)",
                      }}
                      labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                      itemStyle={{ color: "var(--muted-foreground)" }}
                      cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Enrollments"
                      stroke="#D9252A"
                      strokeWidth={2.5}
                      dot={{ fill: "#D9252A", stroke: "#D9252A", r: 3.5 }}
                      activeDot={{ r: 6, fill: "#D9252A", stroke: "var(--card)", strokeWidth: 2 }}
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Quizzes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: "easeOut", duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Active Quizzes</h3>
            </div>
<<<<<<< HEAD
=======
            
>>>>>>> vaishnavi-ui
          </div>
          <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
            <CardContent className="p-0" style={{ borderColor: "var(--border)" }}>
              {allQuizzes.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  <HelpCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border)" }} />
                  No quizzes created yet.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {allQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center gap-4 p-4 transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
                      >
                        <HelpCircle className="w-4 h-4" style={{ color: "var(--foreground)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{quiz.title}</p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{quiz.courseTitle} &middot; {quiz.questionCount} questions</p>
                      </div>
                      <ChevronRight className="w-4 h-4" style={{ color: "var(--border)" }} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Live Classes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, ease: "easeOut", duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Upcoming Live Classes</h3>
            </div>
<<<<<<< HEAD
=======
            
>>>>>>> vaishnavi-ui
          </div>
          <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
            <CardContent className="p-0">
              {allLiveSessions.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  <Video className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border)" }} />
                  No live classes scheduled.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {allLiveSessions.map((session) => {
                    const isLive = session.status === "ONGOING";
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-4 p-4 transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={isLive
                            ? { background: "rgba(217,37,42,0.12)", border: "1px solid rgba(217,37,42,0.25)" }
                            : { background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }
                          }
                        >
                          <Video
                            className="w-4 h-4"
                            style={{ color: isLive ? "#D9252A" : "var(--foreground)" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{session.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{session.courseTitle}</span>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{
                                background: "rgba(255,255,255,0.08)",
                                color: "var(--foreground)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              {format(new Date(session.scheduledAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                          style={isLive
                            ? { background: "rgba(217,37,42,0.12)", color: "#D9252A" }
                            : { background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                          }
                        >
                          {isLive ? "Active" : "Upcoming"}
                        </span>
                        <Link href={`/meet/${session.roomId}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="transition-colors"
                            style={{ color: "var(--muted-foreground)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#D9252A")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
