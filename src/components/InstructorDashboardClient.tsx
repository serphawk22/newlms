"use client";

import { useState } from "react";
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
      className="text-2xl font-medium text-zinc-900"
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
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-zinc-900">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const hasSession = sessionDates.some((d) => isSameDay(new Date(d), day));
          return (
            <div
              key={day.toISOString()}
              className={`relative flex items-center justify-center h-8 w-full rounded-lg text-xs font-medium transition-colors ${
                isToday(day)
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {format(day, "d")}
              {hasSession && !isToday(day) && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />
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
    { label: "Total Students", value: totalStudents, suffix: "+", icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Total Courses", value: totalCourses, suffix: "+", icon: BookOpen, color: "bg-emerald-100 text-emerald-600" },
    { label: "Active Quizzes", value: activeQuizzes, suffix: "", icon: HelpCircle, color: "bg-amber-100 text-amber-600" },
    { label: "Pending Assignments", value: pendingAssignments, suffix: "", icon: ClipboardList, color: "bg-purple-100 text-purple-600" },
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
          <h1 className="text-2xl sm:text-3xl font-medium text-zinc-900">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Here&apos;s what&apos;s happening with your courses today.</p>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={cardItem}>
            <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
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
            <CalendarDays className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Schedule</h3>
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
              <TrendingUp className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Course Performance</h3>
            </div>
            <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartView("weekly")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  chartView === "weekly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setChartView("monthly")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  chartView === "monthly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e4e4e7",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Enrollments"
                      stroke="#18181b"
                      strokeWidth={2.5}
                      dot={{ fill: "#18181b", r: 3 }}
                      activeDot={{ r: 5, fill: "#18181b" }}
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
              <HelpCircle className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Active Quizzes</h3>
            </div>
            <Link href="/instructor#courses" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              See All &rarr;
            </Link>
          </div>
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-0 divide-y divide-zinc-100">
              {allQuizzes.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-sm">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
                  No quizzes created yet.
                </div>
              ) : (
                allQuizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{quiz.title}</p>
                      <p className="text-xs text-zinc-500">{quiz.courseTitle} &middot; {quiz.questionCount} questions</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>
                ))
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
              <Video className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Upcoming Live Classes</h3>
            </div>
            <Link href="/instructor#courses" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Create Quiz &rarr;
            </Link>
          </div>
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-0 divide-y divide-zinc-100">
              {allLiveSessions.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-sm">
                  <Video className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
                  No live classes scheduled.
                </div>
              ) : (
                allLiveSessions.map((session) => {
                  const isLive = session.status === "ONGOING";
                  const statusColor = isLive ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700";
                  return (
                    <div key={session.id} className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors">
                      <div className={`w-9 h-9 rounded-lg ${isLive ? "bg-red-100" : "bg-zinc-100"} flex items-center justify-center shrink-0`}>
                        <Video className={`w-4 h-4 ${isLive ? "text-red-600" : "text-zinc-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{session.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-zinc-500">{session.courseTitle}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                            {format(new Date(session.scheduledAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                        {isLive ? "Active" : "Upcoming"}
                      </span>
                      <Link href={`/meet/${session.roomId}`}>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-blue-600">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
