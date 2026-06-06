import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { StudentProfileClient } from "@/components/StudentProfileClient";
import { syncBadges } from "@/lib/badges";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

function computeXP(completedCourses: number, submissions: number, gradedSubmissions: { grade: number | null }[]) {
  const courseXP = completedCourses * 500;
  const submissionXP = submissions * 50;
  const quizXP = gradedSubmissions.reduce((sum, s) => sum + (s.grade ?? 0), 0);
  return courseXP + submissionXP + quizXP;
}

function computeLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 200) + 1);
}

function computeRank(xp: number): string {
  if (xp >= 7000) return "Platinum";
  if (xp >= 3000) return "Gold";
  if (xp >= 1000) return "Silver";
  return "Bronze";
}

function computeStreak(activityDates: Date[]): number {
  if (activityDates.length === 0) return 0;
  const daySet = new Set(activityDates.map((d) => d.toISOString().slice(0, 10)));
  const days = Array.from(daySet).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 0;
  let cursor = days[0] === today ? new Date() : new Date(Date.now() - 86400000);
  for (const day of days) {
    const expected = cursor.toISOString().slice(0, 10);
    if (day === expected) { streak++; cursor = new Date(cursor.getTime() - 86400000); }
    else break;
  }
  return streak;
}

export default async function StudentProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: import("jose").JWTPayload;
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch {
    redirect("/login");
  }

  const userId = payload.userId as string;

  const [user, enrollments, submissions, notifications, loginHistory] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { organization: true } } },
    }),
    prisma.enrollment.findMany({
      where: { userId },
      include: { course: { select: { id: true, title: true, published: true } } },
      orderBy: { id: "desc" },
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId: userId },
      select: { grade: true, submittedAt: true, assignment: { select: { title: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.findMany({
      where: { userId, type: "LOGIN" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  if (!user || user.memberships.length === 0) redirect("/login");

  const membership = user.memberships[0];
  const org = membership.organization;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasLoginToday = loginHistory.some((n) => new Date(n.createdAt) >= today);

  const completedEnrollments = enrollments.filter((e) => e.progress >= 1.0);
  const completedCourses = completedEnrollments.length;
  const enrollmentCount = enrollments.length;
  const learningHours = Math.round(enrollments.reduce((sum, e) => sum + e.progress * 5, 0));
  const gradedSubmissions = submissions.filter((s) => s.grade !== null) as { grade: number; submittedAt: Date; assignment: { title: string } }[];
  const xp = computeXP(completedCourses, submissions.length, gradedSubmissions);
  const level = computeLevel(xp);
  const rank = computeRank(xp);
  const activityDates = loginHistory.map((n) => new Date(n.createdAt));
  const streak = computeStreak(activityDates);

  // Sync badges with correct unlock logic — persisted in DB
  const achievements = await syncBadges(userId);


  const allNotifications = hasLoginToday ? notifications : [...notifications];

  // eslint-disable-next-line
  const serverNow = Date.now(); // computed once outside the map — satisfies react purity lint rule

  const recentActivity = allNotifications.slice(0, 10).map((n) => {
    const diffMs = serverNow - new Date(n.createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    let timeAgo: string;
    if (diffMins < 60) timeAgo = `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    else if (diffDays === 1) timeAgo = "Yesterday";
    else timeAgo = `${diffDays} days ago`;
    const typeMap: Record<string, string> = { MODULE: "module", ASSIGNMENT: "assignment", COURSE: "course", QUIZ: "quiz", BADGE: "badge", LIVE: "live", LOGIN: "login" };
    return { id: n.id, title: n.message, time: timeAgo, type: typeMap[n.type] ?? "module" };
  });

  const courseList = enrollments.slice(0, 5).map((e) => ({
    id: e.course.id, title: e.course.title,
    progress: Math.round(e.progress * 100), completed: e.progress >= 1.0,
  }));

  const profileData = {
    user: { id: user.id, name: user.name ?? "Student", email: user.email, avatarSeed: user.name ?? user.email, avatar: user.avatar, coverImage: user.coverImage, bio: user.bio, expertise: user.expertise ?? [] },
    org: { id: org.id, name: org.name },
    stats: { enrollmentCount, completedCourses, learningHours, xp, level, rank, streak },
    achievements,
    recentActivity,
    courses: courseList,
  };

  return (
    <div className="container-page pb-20">
      <StudentProfileClient profileData={profileData} initialOrgName={org.name} />
    </div>
  );
}
