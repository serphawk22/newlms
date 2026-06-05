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

interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export function InstructorDashboardClient({
  greeting, userName, userId, totalCourses, totalStudents,
  activeQuizzes, pendingAssignments,
  allQuizzes, allLiveSessions, enrollCounts, weekDays, monthLabels, monthCounts,
}: Props) {
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");

  // Stateful notes/tasks tracking per instructor logged in
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
    { label: "Total Students", value: totalStudents, suffix: "+", icon: Users, color: "bg-blue-100 text-blue-600", href: "/instructor/students" },
    { label: "Total Courses", value: totalCourses, suffix: "+", icon: BookOpen, color: "bg-emerald-100 text-emerald-600", href: "/instructor/courses" },
    { label: "Total Quizzes", value: activeQuizzes, suffix: "", icon: HelpCircle, color: "bg-amber-100 text-amber-600", href: "/instructor/quizzes" },
    { label: "Pending Assignments", value: pendingAssignments, suffix: "", icon: ClipboardList, color: "bg-purple-100 text-purple-600", href: "/instructor/assignments" },
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
            <Link href={stat.href} className="block group focus:outline-none">
              <Card className="border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 active:scale-[0.98] transition-all duration-200 cursor-pointer group-focus-visible:ring-2 group-focus-visible:ring-zinc-400 group-focus-visible:ring-offset-2">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-0.5 group-hover:text-zinc-700 transition-colors duration-200">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
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
        {/* Tasks to be done widget replacing Active Quizzes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: "easeOut", duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Tasks to be done</h3>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
              {tasks.filter(t => !t.completed).length} pending
            </span>
          </div>
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
                <Button type="submit" size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white gap-1 shrink-0">
                  <PlusCircle className="w-4 h-4" /> Add
                </Button>
              </form>

              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 pr-1">
                {tasks.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 text-sm">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
                    All tasks completed!
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 py-2.5 group">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                      />
                      
                      {editingTaskId === task.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditing(task.id)}
                            className="flex-1 px-2 py-0.5 text-sm border border-zinc-300 rounded focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEditing(task.id)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`flex-1 text-sm text-zinc-800 cursor-pointer select-none ${
                            task.completed ? "line-through text-zinc-400" : ""
                          }`}
                          onClick={() => toggleTask(task.id)}
                        >
                          {task.text}
                        </span>
                      )}

                      {editingTaskId !== task.id && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                          <button
                            onClick={() => startEditing(task.id, task.text)}
                            className="text-xs text-zinc-400 hover:text-zinc-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-xs text-red-400 hover:text-red-600"
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
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Upcoming Live Classes</h3>
            </div>
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
