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
import { getCourseBannerUrl, DEFAULT_COURSE_BANNER } from "@/lib/course-images";
import { Card } from "@/components/ui/card";

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
  label, value, icon: Icon,
}: {
  label: string; value: number; icon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: "easeOut", duration: 0.35 }}
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
      className="rounded-2xl p-5 hover:shadow-sm transition-shadow"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border"
        style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--foreground)" }} />
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</p>
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
        <button
          onClick={prevMonth}
          className="p-1 rounded-lg transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
          {MONTH_NAMES[displayMonth]} {displayYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded-lg transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-[10px] font-semibold uppercase tracking-wider py-0.5" style={{ color: "var(--muted-foreground)" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const isTodayDay = isCurrentMonth && day === today.getDate();
          const isActive = activeSet.has(day);
          return (
            <div key={day} className="flex items-center justify-center py-0.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={
                  isActive
                    ? { background: "#D9252A", color: "#FFFFFF" }
                    : isTodayDay
                    ? { border: "2px solid #D9252A", color: "var(--foreground)" }
                    : { color: "var(--foreground)" }
                }
              >
                {day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#D9252A" }} /> Active
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block border" style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }} /> Inactive
        </span>
      </div>
      {currentStreak > 0 && (
        <div className="mt-2 text-xs font-semibold flex items-center gap-1" style={{ color: "#D9252A" }}>
          <Flame className="w-3.5 h-3.5" /> {currentStreak} day streak!
        </div>
      )}
    </div>
  );
}

function TrendingCourseCard({
  course,
}: {
  course: TrendingCourse;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const [localStatus, setLocalStatus] = useState(course.enrollmentStatus);
  const router = useRouter();
  const bannerUrl = getCourseBannerUrl(course.title);

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
      whileHover={{ y: -3 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
    >
      <div className="relative h-36 overflow-hidden">
        <img
          src={bannerUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_COURSE_BANNER;
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(26,29,32,0.95), transparent 60%)",
          }}
        />
        <span
          className="absolute top-3 right-3 text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
          style={{ background: "#D9252A" }}
        >
          NEW
        </span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <p className="font-bold text-sm leading-tight line-clamp-2" style={{ color: "var(--foreground)" }}>{course.title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>by {course.instructorName}</p>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollmentsCount} enrolled</span>
          <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> {course.modulesCount} modules</span>
        </div>
        {localStatus === "ACTIVE" && (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--muted-foreground)" }}>Progress</span>
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>{course.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${course.progress}%`, background: "#D9252A" }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/student/courses/${course.id}`)}
              style={{ background: "#D9252A", color: "#FFFFFF" }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors hover:bg-[#C21F24]"
            >
              Continue Learning <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {localStatus === "PENDING" && (
          <button
            disabled
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl cursor-not-allowed"
          >
            <Clock className="w-3.5 h-3.5" /> Request Pending
          </button>
        )}
        {(localStatus === null || localStatus === "REJECTED") && (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            style={{ background: "var(--secondary-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A]"
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

  const stats = [
    { label: "Enrolled Courses",       value: enrolledCoursesCount,  icon: BookOpen },
    { label: "Completed Assignments",  value: completedAssignments,   icon: CheckCircle2 },
    { label: "Pending Quizzes",        value: pendingQuizzesCount,    icon: HelpCircle },
    { label: "Study Sessions",         value: studySessions,          icon: Clock },
  ];

  const sortedTrending = [...trendingCourses].sort((a, b) => {
    if (trendingTab === "popular") return b.enrollmentsCount - a.enrollmentsCount;
    return 0;
  });

  const totalPending = pendingQuizzes.length + pendingAssignments.length;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── LEFT / MAIN COLUMN ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-5 lg:p-8 space-y-6">

        {/* Welcome Section */}
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              Welcome, {userName}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {orgName && <span className="font-semibold">{orgName}</span>}
              {orgName && " · "}
              Keep pushing your limits!
            </p>
          </motion.div>
          {currentStreak > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              style={{
                background: "rgba(217,37,42,0.12)",
                color: "#D9252A",
                borderColor: "rgba(217,37,42,0.25)",
              }}
              className="flex items-center gap-1.5 border px-3 py-1 rounded-full text-xs font-bold"
            >
              <Flame className="w-3.5 h-3.5 animate-pulse" /> {currentStreak} day streak
            </motion.div>
          )}
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
              <PlayCircle className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Continue Learning</span>
            </div>
            <div
              className="rounded-2xl p-6 flex items-center justify-between gap-4"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
            >
              <div className="flex-1 min-w-0">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mb-1"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <PlayCircle className="w-3 h-3" style={{ color: "#D9252A" }} /> In progress
                </span>
                <h2 className="text-xl font-bold truncate" style={{ color: "var(--foreground)" }}>
                  {continueLearningCourse.title}
                </h2>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${continueLearningCourse.progress}%`, background: "#D9252A" }}
                    />
                  </div>
                  <span className="text-xs font-semibold shrink-0" style={{ color: "var(--muted-foreground)" }}>
                    {continueLearningCourse.progress}% complete
                  </span>
                </div>
              </div>
              <Link
                href={`/student/courses/${continueLearningCourse.id}`}
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", border: "1px solid var(--border)" }}
                className="shrink-0 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors hover:bg-[#D9252A]"
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
            style={{ background: "rgba(217,37,42,0.12)", borderColor: "rgba(217,37,42,0.25)" }}
            className="flex items-center justify-between gap-4 border rounded-2xl px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" style={{ background: "#D9252A" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#D9252A" }}>Live class is in progress!</p>
                <p className="text-xs" style={{ color: "var(--foreground)" }}>Your class started — join now.</p>
              </div>
            </div>
            <Link
              href={`/meet/${ongoingSession.roomId}`}
              style={{ background: "#D9252A", color: "#FFFFFF" }}
              className="shrink-0 flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-[#C21F24]"
            >
              <Video className="w-3.5 h-3.5" /> Join Live
            </Link>
          </motion.div>
        )}

        {/* My Courses */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>My Courses</span>
          </div>
          {enrolledCourses.length === 0 ? (
            <div
              className="rounded-2xl border-dashed border-2 p-8 text-center"
              style={{ background: "transparent", borderColor: "var(--border)" }}
            >
              <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No enrolled courses yet.</p>
              <Link href="/student/courses" className="text-xs hover:underline mt-1 inline-block font-semibold" style={{ color: "#D9252A" }}>
                Browse available courses →
              </Link>
            </div>
          ) : (
            <Card
              className="overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
            >
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {enrolledCourses.map((course) => (
                  <Link key={course.id} href={`/student/courses/${course.id}`}>
                    <div
                      className="flex items-center gap-4 px-5 py-4 transition-colors group cursor-pointer"
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid var(--border)" }}>
                        <img
                          src={getCourseBannerUrl(course.title)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_COURSE_BANNER;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{course.title}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${course.progress}%`, background: "#D9252A" }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--muted-foreground)" }}>{course.progress}%</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 transition-all shrink-0" style={{ color: "var(--border)" }} />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Trending Courses */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Trending Courses</span>
            </div>
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-full p-0.5 self-start sm:self-auto" style={{ background: "var(--secondary-background)" }}>
              {([
                { key: "recent",   label: "Recently Added" },
                { key: "popular",  label: "Most Popular" },
                { key: "featured", label: "Featured" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTrendingTab(tab.key)}
                  style={{
                    background: trendingTab === tab.key ? "var(--card)" : "transparent",
                    color: trendingTab === tab.key ? "#D9252A" : "var(--muted-foreground)",
                  }}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer"
                >
                  {trendingTab === tab.key && (
                    <span className="inline-flex items-center gap-1 mr-1">
                      {tab.key === "recent" && <Zap className="w-3 h-3" style={{ color: "#D9252A" }} />}
                      {tab.key === "popular" && <TrendingUp className="w-3 h-3" style={{ color: "#D9252A" }} />}
                      {tab.key === "featured" && <Flame className="w-3 h-3" style={{ color: "#D9252A" }} />}
                    </span>
                  )}{tab.label}
                </button>
              ))}
            </div>
          </div>

          {trendingCourses.length === 0 ? (
            <div
              className="rounded-2xl border-dashed border-2 p-8 text-center"
              style={{ background: "transparent", borderColor: "var(--border)" }}
            >
              <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No courses available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTrending.map((course) => (
                <TrendingCourseCard key={course.id} course={course} />
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
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
          className="rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4" style={{ color: "#D9252A" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Learning Streak</h3>
          </div>
          <p className="text-[11px] mb-4" style={{ color: "var(--muted-foreground)" }}>Stay active every day</p>

          {/* Streak Stats */}
<<<<<<< HEAD
          <div className="flex justify-center mb-4">
            <div className="text-center bg-zinc-50 rounded-xl py-4 px-8 w-full max-w-[200px]">
              <p className="text-3xl font-bold text-orange-500">{currentStreak}</p>
              <p className="text-xs text-zinc-500 mt-1 font-medium">Current Streak</p>
            </div>
=======
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Current",     value: currentStreak },
              { label: "Best",        value: bestStreak },
              { label: "Active Days", value: activeDays },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-xl py-2.5 px-1 border" style={{ background: "var(--secondary-background)", borderColor: "var(--border)" }}>
                <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{s.value}</p>
                <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
              </div>
            ))}
>>>>>>> vaishnavi-ui
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
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
          className="rounded-2xl p-5"
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--foreground)" }}>Pending Items</h3>

          {totalPending === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3 border"
                style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}
              >
                <CheckCircle2 className="w-6 h-6" style={{ color: "var(--foreground)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>All caught up!</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>No pending quizzes or assignments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQuizzes.length > 0 && (
                <div
                  className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" style={{ color: "var(--foreground)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Pending Quizzes</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: "rgba(217,37,42,0.12)",
                      borderColor: "rgba(217,37,42,0.25)",
                      color: "#D9252A",
                    }}
                  >
                    {pendingQuizzes.length}
                  </span>
                </div>
              )}
              {pendingAssignments.length > 0 && (
                <div
                  className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" style={{ color: "var(--foreground)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Pending Assignments</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: "rgba(217,37,42,0.12)",
                      borderColor: "rgba(217,37,42,0.25)",
                      color: "#D9252A",
                    }}
                  >
                    {pendingAssignments.length}
                  </span>
                </div>
              )}
              {/* List individual items */}
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {pendingQuizzes.slice(0, 3).map((q) => (
                  <Link key={q.id} href={`/student/courses/${q.courseId}`}>
                    <div
                      className="flex items-center gap-3 py-2.5 rounded-lg px-1 cursor-pointer group transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}>
                        <HelpCircle className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate group-hover:text-[#D9252A] transition-colors" style={{ color: "var(--foreground)" }}>{q.title}</p>
                        <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{q.questionCount} questions</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--border)" }} />
                    </div>
                  </Link>
                ))}
                {pendingAssignments.slice(0, 3).map((a) => (
                  <Link key={a.id} href={`/student/courses/${a.courseId}`}>
                    <div
                      className="flex items-center gap-3 py-2.5 rounded-lg px-1 cursor-pointer group transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate group-hover:text-[#D9252A] transition-colors" style={{ color: "var(--foreground)" }}>{a.title}</p>
                        <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Assignment</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--border)" }} />
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
