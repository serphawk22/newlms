"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen, CheckCircle2, HelpCircle, Clock, ChevronRight,
  Video, Flame, Zap, LayoutGrid, TrendingUp, Users,
  PlayCircle, ArrowRight,
} from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrolledCourse {
  id: string;
  title: string;
  progress: number;
  instructorName: string;
  modulesCount: number;
  enrollmentsCount: number;
}

interface ContinueLearningCourse {
  id: string;
  title: string;
  progress: number;
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

interface TrendingCourse {
  id: string;
  title: string;
  instructorName: string;
  modulesCount: number;
  enrollmentsCount: number;
  enrollmentStatus: "PENDING" | "ACTIVE" | "REJECTED" | null;
  progress: number;
}

interface Props {
  userName: string;
  orgName: string;
  enrolledCoursesCount: number;
  completedAssignments: number;
  pendingQuizzesCount: number;
  studySessions: number;
  enrolledCourses: EnrolledCourse[];
  continueLearningCourse: ContinueLearningCourse | null;
  pendingQuizzes: PendingQuiz[];
  pendingAssignments: PendingAssignment[];
  ongoingSession: { roomId: string } | null;
  trendingCourses: TrendingCourse[];
  currentStreak: number;
  bestStreak: number;
  activeDays: number;
  activeDayNumbers: number[];
  currentMonth: number;
  currentYear: number;
}

// ─── Course colour palette (cycles) ──────────────────────────────────────────
const COURSE_GRADIENTS = [
  "from-emerald-700 to-teal-600",
  "from-purple-700 to-pink-600",
  "from-blue-700 to-cyan-600",
  "from-orange-600 to-amber-500",
  "from-rose-700 to-pink-600",
  "from-indigo-700 to-violet-600",
  "from-green-700 to-lime-600",
  "from-sky-700 to-blue-500",
];

const CARD_BG_GRADIENTS = [
  "from-purple-800 to-pink-700",
  "from-teal-700 to-emerald-600",
  "from-green-700 to-lime-600",
  "from-blue-700 to-sky-600",
  "from-rose-700 to-orange-600",
  "from-indigo-700 to-purple-600",
];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Calendar helper ──────────────────────────────────────────────────────────
function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconBg, iconColor, href,
}: {
  label: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; href: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: "easeOut", duration: 0.35 }}
      className="w-full"
    >
      <Link href={href} className="block group focus:outline-none w-full">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 hover:shadow-md hover:border-zinc-200 active:scale-[0.98] transition-all duration-200 cursor-pointer group-focus-visible:ring-2 group-focus-visible:ring-zinc-400 group-focus-visible:ring-offset-2">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
          <p className="text-2xl font-semibold text-zinc-900">{value}</p>
          <p className="text-xs text-zinc-500 mt-0.5 group-hover:text-zinc-700 transition-colors duration-200">{label}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function StreakCalendar({
  month, year, activeDayNumbers, currentStreak,
}: {
  month: number; year: number; activeDayNumbers: number[]; currentStreak: number;
}) {
  const [displayMonth, setDisplayMonth] = useState(month);
  const [displayYear, setDisplayYear] = useState(year);

  const daysInMonth = getDaysInMonth(displayMonth, displayYear);
  const firstDay = getFirstDayOfMonth(displayMonth, displayYear);
  const today = new Date();
  const isCurrentMonth = displayMonth === month && displayYear === year;

  const activeSet = isCurrentMonth ? new Set(activeDayNumbers) : new Set<number>();

  const prevMonth = () => {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(y => y - 1); }
    else setDisplayMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(y => y + 1); }
    else setDisplayMonth(m => m + 1);
  };

  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4 text-zinc-400 rotate-180" />
        </button>
        <span className="text-xs font-medium text-zinc-700">
          {MONTH_NAMES[displayMonth]} {displayYear}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[10px] text-zinc-400 font-medium py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const isToday = isCurrentMonth && day === today.getDate();
          const isActive = activeSet.has(day);
          return (
            <div key={day} className="flex items-center justify-center py-0.5">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium
                  ${isActive
                    ? "bg-orange-500 text-white"
                    : isToday
                    ? "ring-2 ring-orange-400 text-zinc-700"
                    : "text-zinc-400"}
                `}
              >
                {isActive ? "🔥" : day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Active
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 inline-block" /> Inactive
        </span>
      </div>
      {currentStreak > 0 && (
        <div className="mt-2 text-xs font-medium text-orange-500 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" /> {currentStreak} day streak!
        </div>
      )}
    </div>
  );
}

function TrendingCourseCard({
  course, index,
}: {
  course: TrendingCourse; index: number;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const [localStatus, setLocalStatus] = useState(course.enrollmentStatus);
  const router = useRouter();
  const gradient = CARD_BG_GRADIENTS[index % CARD_BG_GRADIENTS.length];

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault();
    setEnrolling(true);
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      if (res.ok) setLocalStatus("PENDING");
    } catch { /* silent */ }
    finally { setEnrolling(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: "easeOut", duration: 0.4 }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
      className="bg-white rounded-2xl border border-zinc-100 overflow-hidden"
    >
      {/* Banner */}
      <div className={`h-36 bg-gradient-to-br ${gradient} relative flex items-end justify-end p-3`}>
        <BookOpen className="w-10 h-10 text-white/20" />
        <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
          NEW
        </span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <p className="font-semibold text-sm text-zinc-900 leading-tight line-clamp-2">{course.title}</p>
          <p className="text-xs text-zinc-400 mt-0.5">by {course.instructorName}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollmentsCount} enrolled</span>
          <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> {course.modulesCount} modules</span>
        </div>
        {localStatus === "ACTIVE" && (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Progress</span>
                <span className="font-medium text-zinc-900">{course.progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => router.push(`/student/courses/${course.id}`)}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded-xl transition-colors"
            >
              Continue Learning <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {localStatus === "PENDING" && (
          <button disabled className="w-full flex items-center justify-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-medium py-2 rounded-xl cursor-not-allowed">
            <Clock className="w-3.5 h-3.5" /> Request Pending
          </button>
        )}
        {(localStatus === null || localStatus === "REJECTED") && (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="w-full flex items-center justify-center gap-1.5 border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-medium py-2 rounded-xl transition-colors"
          >
            {enrolling ? "Requesting…" : "Request to Join"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StudentDashboardClient({
  userName, orgName,
  enrolledCoursesCount, completedAssignments, pendingQuizzesCount, studySessions,
  enrolledCourses, continueLearningCourse,
  pendingQuizzes, pendingAssignments,
  ongoingSession, trendingCourses,
  currentStreak, bestStreak, activeDays,
  activeDayNumbers, currentMonth, currentYear,
}: Props) {
  const [trendingTab, setTrendingTab] = useState<"recent" | "popular" | "featured">("recent");
  const router = useRouter();

  // Find first active course for reading materials and quizzes fallback
  const firstActiveCourseId = enrolledCourses.length > 0 ? enrolledCourses[0].id : "";
  const firstPendingQuizCourseId = pendingQuizzes.length > 0 ? pendingQuizzes[0].courseId : firstActiveCourseId;

  const stats = [
    { label: "Enrolled Courses",       value: enrolledCoursesCount,  icon: BookOpen,      iconBg: "bg-blue-50",   iconColor: "text-blue-500", href: "/student/courses" },
    { label: "Completed Assignments",  value: completedAssignments,   icon: CheckCircle2,  iconBg: "bg-green-50",  iconColor: "text-green-500", href: firstActiveCourseId ? `/student/courses/${firstActiveCourseId}?tab=assignments` : "/student" },
    { label: "Pending Quizzes",        value: pendingQuizzesCount,    icon: HelpCircle,    iconBg: "bg-amber-50",  iconColor: "text-amber-500", href: firstPendingQuizCourseId ? `/student/courses/${firstPendingQuizCourseId}?tab=quizzes` : "/student" },
    { label: "Study Sessions",         value: studySessions,          icon: Clock,         iconBg: "bg-purple-50", iconColor: "text-purple-500", href: firstActiveCourseId ? `/student/courses/${firstActiveCourseId}?tab=reading` : "/student" },
  ];

  // Trending tab filter
  const sortedTrending = [...trendingCourses].sort((a, b) => {
    if (trendingTab === "popular") return b.enrollmentsCount - a.enrollmentsCount;
    return 0; // recent and featured keep original order
  });

  const totalPending = pendingQuizzes.length + pendingAssignments.length;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-50 w-full">
      {/* ── LEFT / MAIN COLUMN ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-5 lg:p-8 space-y-6">

        {/* Welcome Section */}
        <div className="flex items-start justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl font-semibold text-zinc-900">Welcome, {userName}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {orgName && <span className="text-blue-500 font-medium">{orgName}</span>}
              {orgName && " · "}
              Keep pushing your limits!
            </p>
          </motion.div>
          
          <div className="flex items-center gap-3 shrink-0">
            {currentStreak > 0 && (
              <Link href="/student/progress">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.35 }}
                  className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 hover:bg-orange-100 hover:border-orange-300 transition-colors text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5" /> {currentStreak} day streak
                </motion.div>
              </Link>
            )}
            <div className="bg-white rounded-full border border-zinc-200 shadow-sm p-0.5 flex items-center justify-center">
              <NotificationsDropdown />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Continue Learning */}
        {continueLearningCourse && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Continue Learning</span>
            </div>
            <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-700 rounded-2xl p-6 flex items-center justify-between gap-4 shadow-lg">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-emerald-200 font-medium uppercase tracking-widest flex items-center gap-1 mb-1">
                  <PlayCircle className="w-3 h-3" /> Continue Learning
                </span>
                <h2 className="text-xl font-semibold text-white truncate">{continueLearningCourse.title}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${continueLearningCourse.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/80 shrink-0">{continueLearningCourse.progress}% complete</span>
                </div>
              </div>
              <Link
                href={`/student/courses/${continueLearningCourse.id}`}
                className="shrink-0 flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors backdrop-blur-sm border border-white/20"
              >
                Resume <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Live Class Alert */}
        {ongoingSession && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Live class is in progress!</p>
                <p className="text-xs text-red-600">Your class started — join now.</p>
              </div>
            </div>
            <Link
              href={`/meet/${ongoingSession.roomId}`}
              className="shrink-0 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Video className="w-3.5 h-3.5" /> Join Live
            </Link>
          </motion.div>
        )}

        {/* My Courses */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">My Courses</span>
          </div>
          {enrolledCourses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
              <BookOpen className="w-8 h-8 mx-auto text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No enrolled courses yet.</p>
              <Link href="/student/courses" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                Browse available courses →
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm divide-y divide-zinc-50 overflow-hidden">
              {enrolledCourses.map((course, idx) => (
                <Link key={course.id} href={`/student/courses/${course.id}`}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors group cursor-pointer">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length]} flex items-center justify-center shrink-0`}>
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{course.title}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-700 rounded-full transition-all duration-700"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-zinc-400 shrink-0">{course.progress}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Trending Courses */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-800">Trending Courses</span>
            </div>
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-900 rounded-full p-0.5 self-start sm:self-auto">
              {([
                { key: "recent",   label: "Recently Added" },
                { key: "popular",  label: "Most Popular" },
                { key: "featured", label: "Featured" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTrendingTab(tab.key)}
                  className={`
                    text-[11px] font-medium px-3 py-1.5 rounded-full transition-all
                    ${trendingTab === tab.key
                      ? "bg-white text-zinc-900"
                      : "text-zinc-400 hover:text-zinc-200"}
                  `}
                >
                  {trendingTab === tab.key && (
                    <span className="inline-flex items-center gap-1">
                      {tab.key === "recent" && <Zap className="w-3 h-3 text-amber-500" />}
                      {tab.key === "popular" && <TrendingUp className="w-3 h-3 text-blue-400" />}
                      {tab.key === "featured" && <Flame className="w-3 h-3 text-orange-400" />}
                    </span>
                  )}{" "}{tab.label}
                </button>
              ))}
            </div>
          </div>

          {trendingCourses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
              <BookOpen className="w-8 h-8 mx-auto text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No courses available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTrending.map((course, idx) => (
                <TrendingCourseCard key={course.id} course={course} index={idx} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-80 shrink-0 p-5 lg:pl-0 lg:pr-8 lg:py-8 space-y-5">

        {/* Learning Streak Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-zinc-800">Learning Streak</h3>
          </div>
          <p className="text-[11px] text-zinc-400 mb-4">Stay active every day</p>

          {/* Streak Stats */}
          <div className="flex justify-center mb-4">
            <div className="text-center bg-zinc-50 rounded-xl py-4 px-8 w-full max-w-[200px]">
              <p className="text-3xl font-bold text-orange-500">{currentStreak}</p>
              <p className="text-xs text-zinc-500 mt-1 font-medium">Current Streak</p>
            </div>
          </div>

          {/* Calendar */}
          <StreakCalendar
            month={currentMonth}
            year={currentYear}
            activeDayNumbers={activeDayNumbers}
            currentStreak={currentStreak}
          />
        </motion.div>

        {/* Pending Items Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5"
        >
          <h3 className="text-sm font-semibold text-zinc-800 mb-4">Pending Items</h3>

          {totalPending === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-sm font-medium text-zinc-700">All caught up!</p>
              <p className="text-xs text-zinc-400 mt-0.5">No pending quizzes or assignments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQuizzes.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-zinc-700">Pending Quizzes</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    {pendingQuizzes.length}
                  </span>
                </div>
              )}
              {pendingAssignments.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-zinc-700">Pending Assignments</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {pendingAssignments.length}
                  </span>
                </div>
              )}
              {/* List individual items */}
              <div className="divide-y divide-zinc-50">
                {pendingQuizzes.slice(0, 3).map((q) => (
                  <Link key={q.id} href={`/student/courses/${q.courseId}`}>
                    <div className="flex items-center gap-3 py-2.5 hover:bg-zinc-50 rounded-lg px-1 cursor-pointer group">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-800 truncate">{q.title}</p>
                        <p className="text-[10px] text-zinc-400">{q.questionCount} questions</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 shrink-0" />
                    </div>
                  </Link>
                ))}
                {pendingAssignments.slice(0, 3).map((a) => (
                  <Link key={a.id} href={`/student/courses/${a.courseId}`}>
                    <div className="flex items-center gap-3 py-2.5 hover:bg-zinc-50 rounded-lg px-1 cursor-pointer group">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-800 truncate">{a.title}</p>
                        <p className="text-[10px] text-zinc-400">Assignment</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
