"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  HelpCircle, ChevronRight, ArrowRight,
  Video, ChevronLeft, ClipboardList, PlusCircle, Users, BookOpen,
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

interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface Props {
  greeting: string;
  userName: string;
  userId: string;
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
  greeting, userName, userId, totalCourses, totalStudents,
  activeQuizzes, pendingAssignments,
  allQuizzes, allLiveSessions, enrollCounts, weekDays, monthLabels, monthCounts,
}: Props) {
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`tasks-${userId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [newTaskText, setNewTaskText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    localStorage.setItem(`tasks-${userId}`, JSON.stringify(newTasks));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text: newTaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTask, ...tasks];
    saveTasks(updated);
    setNewTaskText("");
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
  };

  const startEditing = (id: string, text: string) => {
    setEditingTaskId(id);
    setEditingText(text);
  };

  const saveEditing = (id: string) => {
    if (!editingText.trim()) return;
    const updated = tasks.map(t => t.id === id ? { ...t, text: editingText.trim() } : t);
    saveTasks(updated);
    setEditingTaskId(null);
  };

  const stats = [
    { label: "Total Students", value: totalStudents, suffix: "+", icon: Users, href: "/instructor/students" },
    { label: "Total Courses", value: totalCourses, suffix: "+", icon: BookOpen, href: "/instructor/courses" },
    { label: "Total Quizzes", value: activeQuizzes, suffix: "", icon: HelpCircle, href: "/instructor/quizzes" },
    { label: "Pending Assignments", value: pendingAssignments, suffix: "", icon: ClipboardList, href: "/instructor/assignments" },
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} variants={cardItem}>
              <Link href={stat.href} className="block group focus:outline-none">
                <Card className="transition-all duration-200 cursor-pointer hover:-translate-y-0.5" style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                    </div>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    <p className="text-xs font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Calendar + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: "easeOut", duration: 0.4 }}
        >
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>Schedule</h3>
          <MiniCalendar sessionDates={sessionDates} />
        </motion.div>

        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ease: "easeOut", duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Course Performance</h3>
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
        {/* Tasks to be done widget replacing Active Quizzes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: "easeOut", duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Tasks to be done</h3>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
              {tasks.filter(t => !t.completed).length} pending
            </span>
          </div>
          <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                />
                <Button type="submit" size="sm" className="gap-1 shrink-0" style={{ background: "var(--foreground)", color: "var(--background)" }}>
                  <PlusCircle className="w-4 h-4" /> Add
                </Button>
              </form>

              <div className="max-h-64 overflow-y-auto divide-y pr-1" style={{ borderColor: "var(--border)" }}>
                {tasks.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                    <ClipboardList className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border)" }} />
                    All tasks completed!
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 py-2.5 group" style={{ borderColor: "var(--border)" }}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="w-4 h-4 rounded cursor-pointer"
                        style={{ accentColor: "#D9252A" }}
                      />

                      {editingTaskId === task.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditing(task.id)}
                            className="flex-1 px-2 py-0.5 text-sm rounded focus:outline-none"
                            style={{ border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)" }}
                            autoFocus
                          />
                          <button
                            onClick={() => saveEditing(task.id)}
                            className="text-xs font-semibold"
                            style={{ color: "var(--foreground)" }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`flex-1 text-sm cursor-pointer select-none ${task.completed ? "line-through" : ""}`}
                          style={{ color: task.completed ? "var(--muted-foreground)" : "var(--foreground)" }}
                          onClick={() => toggleTask(task.id)}
                        >
                          {task.text}
                        </span>
                      )}

                      {editingTaskId !== task.id && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                          <button
                            onClick={() => startEditing(task.id, task.text)}
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#D9252A"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
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
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Upcoming Live Classes</h3>
          </div>
          <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
            <CardContent className="p-0">
              {allLiveSessions.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
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
