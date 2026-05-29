"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  BookOpen, CheckCircle2, HelpCircle, Clock, TrendingUp, Bell, Search,
  ChevronRight, Video, Calendar, Activity, GraduationCap,
  ClipboardList, Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import BarsLoader from "@/components/ui/bars-loader";

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

interface EnrolledCourse {
  id: string;
  title: string;
  progress: number;
}

interface UnenrolledCourse {
  id: string;
  title: string;
  orgName: string;
  enrolled: boolean;
}

interface PendingQuiz {
  id: string;
  title: string;
  courseId: string;
  questionCount: number;
}

interface PendingAssignment {
  id: string;
  title: string;
  courseId: string;
}

interface LiveSession {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
  roomId: string;
  courseTitle: string;
}

interface ActivityItem {
  id: string;
  title: string;
  time: string;
  type: string;
}

interface Props {
  greeting: string;
  userName: string;
  orgName: string;
  enrolledCoursesCount: number;
  completedAssignments: number;
  pendingQuizzesCount: number;
  studySessions: number;
  enrolledCourses: EnrolledCourse[];
  unenrolledCourses: UnenrolledCourse[];
  pendingQuizzes: PendingQuiz[];
  pendingAssignments: PendingAssignment[];
  liveSessions: LiveSession[];
  ongoingSession: { roomId: string } | null;
  recentActivity: ActivityItem[];
}

export function StudentDashboardClient({
  greeting, userName, orgName, enrolledCoursesCount, completedAssignments,
  pendingQuizzesCount, studySessions, enrolledCourses, unenrolledCourses,
  pendingQuizzes, pendingAssignments, liveSessions, ongoingSession, recentActivity,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCourses = unenrolledCourses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUpcoming = pendingQuizzes.length + pendingAssignments.length;

  const stats = [
    { label: "Enrolled Courses", value: enrolledCoursesCount, icon: BookOpen, color: "bg-blue-100 text-blue-600" },
    { label: "Completed Assignments", value: completedAssignments, icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
    { label: "Pending Quizzes", value: pendingQuizzesCount, icon: HelpCircle, color: "bg-amber-100 text-amber-600" },
    { label: "Study Sessions", value: studySessions, icon: Clock, color: "bg-purple-100 text-purple-600" },
  ];

  const activityIcons: Record<string, React.ReactNode> = {
    course: <BookOpen className="w-4 h-4 text-blue-500" />,
    assignment: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    quiz: <HelpCircle className="w-4 h-4 text-amber-500" />,
    badge: <GraduationCap className="w-4 h-4 text-purple-500" />,
    live: <Video className="w-4 h-4 text-red-500" />,
    login: <Activity className="w-4 h-4 text-zinc-500" />,
  };

  const activityColors: Record<string, string> = {
    course: "bg-blue-100",
    assignment: "bg-emerald-100",
    quiz: "bg-amber-100",
    badge: "bg-purple-100",
    live: "bg-red-100",
    login: "bg-zinc-100",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-zinc-900">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Welcome to {orgName}. Keep up the great work!</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 lg:w-64 pl-9 pr-4 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all"
            />
          </div>
          <button className="relative p-2 rounded-xl hover:bg-zinc-100 transition-colors">
            <Bell className="w-5 h-5 text-zinc-500" />
            {recentActivity.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white text-xs font-medium">
            {userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
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
                <AnimatedCounter value={stat.value} />
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrolled Courses (left, wider) */}
        <motion.div
          className="lg:col-span-2 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: "easeOut", duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">My Courses</h3>
            </div>
            {enrolledCourses.length > 3 && (
              <Link href="/student/courses" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                View All &rarr;
              </Link>
            )}
          </div>

          {enrolledCourses.length === 0 ? (
            <Card className="border-dashed border-zinc-300">
              <CardContent className="p-8 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                <p className="text-sm font-medium text-zinc-500">No courses enrolled yet</p>
                <p className="text-xs text-zinc-400 mt-1">Browse available courses below to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {enrolledCourses.slice(0, 5).map((course, idx) => (
                <Link key={course.id} href={`/student/courses/${course.id}`}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05, ease: "easeOut", duration: 0.3 }}
                    className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate group-hover:text-zinc-700 transition-colors">
                          {course.title}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-zinc-900 rounded-full transition-all duration-700"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-zinc-500 shrink-0">{course.progress}%</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}

          {/* Available Courses */}
          {filteredCourses.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Available Courses</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCourses.slice(0, 6).map((course) => (
                  <EnrollableCourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Upcoming Deadlines (right, narrower) */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ease: "easeOut", duration: 0.4 }}
        >
          {/* Ongoing Live Session */}
          {ongoingSession && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Video className="w-4 h-4 text-red-500" />
                <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Live Now</h3>
              </div>
              <Card className="border-red-200 bg-red-50/50 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">Class in Progress</p>
                    <p className="text-xs text-zinc-500">Join now!</p>
                  </div>
                  <Link href={`/meet/${ongoingSession.roomId}`}>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-medium px-3 py-1.5 h-auto rounded-lg">
                      Join
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upcoming Summary Card */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Upcoming</h3>
              {totalUpcoming > 0 && (
                <span className="ml-auto text-[10px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {totalUpcoming} items
                </span>
              )}
            </div>
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="p-0 divide-y divide-zinc-100">
                {pendingQuizzes.length === 0 && pendingAssignments.length === 0 ? (
                  <div className="p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                    <p className="text-sm text-zinc-400">All caught up!</p>
                    <p className="text-xs text-zinc-300">No pending quizzes or assignments.</p>
                  </div>
                ) : (
                  <>
                    {pendingQuizzes.slice(0, 3).map((quiz) => (
                      <Link key={quiz.id} href={`/student/courses/${quiz.courseId}`}>
                        <div className="flex items-center gap-3 p-3 hover:bg-zinc-50 transition-colors group cursor-pointer">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <HelpCircle className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate group-hover:text-zinc-700">{quiz.title}</p>
                            <p className="text-xs text-zinc-500">{quiz.questionCount} questions</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                        </div>
                      </Link>
                    ))}
                    {pendingAssignments.slice(0, 3).map((assignment) => (
                      <Link key={assignment.id} href={`/student/courses/${assignment.courseId}`}>
                        <div className="flex items-center gap-3 p-3 hover:bg-zinc-50 transition-colors group cursor-pointer">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate group-hover:text-zinc-700">{assignment.title}</p>
                            <p className="text-xs text-zinc-500">Assignment</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Live Classes */}
          {liveSessions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Video className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Live Classes</h3>
              </div>
              <Card className="border-zinc-200 shadow-sm">
                <CardContent className="p-0 divide-y divide-zinc-100">
                  {liveSessions.slice(0, 3).map((session) => (
                    <div key={session.id} className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{session.title}</p>
                        <p className="text-xs text-zinc-500">{format(new Date(session.scheduledAt), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, ease: "easeOut", duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-medium text-zinc-700 uppercase tracking-wider">Recent Activity</h3>
          </div>
          {recentActivity.length > 0 && (
            <span className="text-[10px] font-medium text-zinc-400">{recentActivity.length} notifications</span>
          )}
        </div>
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="p-0 divide-y divide-zinc-100">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
                No recent activity yet.
              </div>
            ) : (
              recentActivity.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 sm:p-4 hover:bg-zinc-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${activityColors[item.type] ?? "bg-zinc-100"} flex items-center justify-center shrink-0`}>
                    {activityIcons[item.type] ?? <Bell className="w-4 h-4 text-zinc-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700 truncate">{item.title}</p>
                  </div>
                  <span className="text-[11px] text-zinc-400 shrink-0">{item.time}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function EnrollableCourseCard({ course }: { course: UnenrolledCourse }) {
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEnrolling(true);
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      if (res.ok) {
        setEnrolled(true);
      }
    } catch {
      // silent fail
    } finally {
      setEnrolling(false);
    }
  };

  if (enrolled) {
    return (
      <Link href={`/student/courses/${course.id}`}>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-md transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate group-hover:text-emerald-700 transition-colors">{course.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[11px] text-emerald-600 font-medium">Enrolled</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 hover:shadow-md transition-all group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
          <GraduationCap className="w-5 h-5 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 truncate">{course.title}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{course.orgName}</p>
        </div>
        <button
          onClick={handleEnroll}
          disabled={enrolling}
          className="shrink-0 flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-400 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          {enrolling ? (
            <BarsLoader size="sm" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
          {enrolling ? "Enrolling…" : "Enroll"}
        </button>
      </div>
    </div>
  );
}
