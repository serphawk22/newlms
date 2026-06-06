import { prisma } from "@/lib/prisma";

/**
 * lib/badges.ts
 *
 * Central badge definitions and unlock logic.
 * syncBadges() computes which badges the student has earned,
 * persists them in the UserBadge table, and returns the full badge list.
 *
 * Unlock criteria (per spec):
 *  FastLearner  - completed > 2 courses
 *  QuizMaster   - scored >= 90% in at least 5 quizzes
 *  EarlyBird    - logged in before 9:00 AM on 5 different days
 *  Helper       - participated in Q/A discussions > 10 times
 *  Dedicated    - maintained a 7-day consecutive login streak
 *  Scholar      - completed 5 courses with avg assignment score > 85%
 */

export interface BadgeDefinition {
  name: string;
  icon: string;
  color: string;
  criteria: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    name: "Fast Learner",
    icon: "🚀",
    color: "from-blue-400 to-indigo-500",
    criteria: "Complete more than 2 courses.",
  },
  {
    name: "Quiz Master",
    icon: "🧠",
    color: "from-purple-400 to-pink-500",
    criteria: "Score 90% or above in at least 5 quizzes.",
  },
  {
    name: "Early Bird",
    icon: "🌅",
    color: "from-orange-400 to-amber-500",
    criteria: "Log in before 9:00 AM on 5 different days.",
  },
  {
    name: "Helper",
    icon: "🤝",
    color: "from-emerald-400 to-teal-500",
    criteria: "Participate in Q&A discussions more than 10 times.",
  },
  {
    name: "Dedicated",
    icon: "💪",
    color: "from-red-400 to-rose-500",
    criteria: "Maintain a 7-day consecutive login streak.",
  },
  {
    name: "Scholar",
    icon: "📚",
    color: "from-cyan-400 to-sky-500",
    criteria: "Complete 5 courses with an average assignment score above 85%.",
  },
];

function computeLoginStreak(dateStrs: string[]): number {
  if (dateStrs.length === 0) return 0;
  const daySet = new Set(dateStrs);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const days = Array.from(daySet).sort().reverse();
  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 0;
  let cursor = days[0] === today ? new Date() : new Date(Date.now() - 86400000);
  for (const day of days) {
    const expected = cursor.toISOString().slice(0, 10);
    if (day === expected) {
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

function makeId(): string {
  return "ub" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let tableInitialized = false;

async function ensureUserBadgeTable(): Promise<void> {
  if (tableInitialized) return;
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UserBadge" (
        "id"         TEXT         NOT NULL,
        "userId"     TEXT         NOT NULL,
        "badgeName"  TEXT         NOT NULL,
        "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserBadge_userId_badgeName_key" UNIQUE ("userId", "badgeName")
      )
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "UserBadge"("userId")
    `;
    tableInitialized = true;
  } catch {
    tableInitialized = true;
  }
}

export async function syncBadges(
  userId: string
): Promise<(BadgeDefinition & { unlocked: boolean })[]> {
  try {
    const [
      completedEnrollments,
      quizSubmissions,
      dailyLogins,
      courseComments,
      assignmentSubmissions,
    ] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId, progress: { gte: 1.0 } },
        select: { courseId: true },
      }),
      prisma.quizSubmission.findMany({
        where: { studentId: userId },
        select: { obtainedMarks: true, totalMarks: true },
      }),
      prisma.dailyLogin.findMany({
        where: { userId },
        select: { dateStr: true, createdAt: true },
      }),
      prisma.courseComment.findMany({
        where: { authorId: userId },
        select: { id: true },
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId: userId, grade: { not: null } },
        select: { grade: true, assignment: { select: { courseId: true } } },
      }),
    ]);

    const fastLearnerUnlocked = completedEnrollments.length > 2;

    const highScoreQuizzes = quizSubmissions.filter(
      (s) => s.totalMarks > 0 && s.obtainedMarks / s.totalMarks >= 0.9
    );
    const quizMasterUnlocked = highScoreQuizzes.length >= 5;

    const earlyLoginDays = new Set<string>();
    for (const login of dailyLogins) {
      const loginDate = new Date(login.createdAt);
      if (loginDate.getHours() < 9) {
        earlyLoginDays.add(login.dateStr);
      }
    }
    const earlyBirdUnlocked = earlyLoginDays.size >= 5;

    const helperUnlocked = courseComments.length > 10;

    const dateStrs = dailyLogins.map((d) => d.dateStr);
    const streak = computeLoginStreak(dateStrs);
    const dedicatedUnlocked = streak >= 7;

    let scholarUnlocked = false;
    if (completedEnrollments.length >= 5) {
      const byCourse = new Map<string, number[]>();
      for (const sub of assignmentSubmissions as { grade: number; assignment: { courseId: string } }[]) {
        const cid = sub.assignment.courseId;
        if (!byCourse.has(cid)) byCourse.set(cid, []);
        byCourse.get(cid)!.push(sub.grade);
      }
      const completedCourseIds = new Set(completedEnrollments.map((e) => e.courseId));
      let qualifyingCount = 0;
      for (const [courseId, grades] of byCourse) {
        if (!completedCourseIds.has(courseId)) continue;
        const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
        if (avg > 85) qualifyingCount++;
      }
      scholarUnlocked = qualifyingCount >= 5;
    }

    const unlockMap: Record<string, boolean> = {
      "Fast Learner": fastLearnerUnlocked,
      "Quiz Master": quizMasterUnlocked,
      "Early Bird": earlyBirdUnlocked,
      "Helper": helperUnlocked,
      "Dedicated": dedicatedUnlocked,
      "Scholar": scholarUnlocked,
    };

    try {
      await ensureUserBadgeTable();
      const toUnlock = BADGE_DEFINITIONS.filter((b) => unlockMap[b.name]).map((b) => b.name);
      for (const badgeName of toUnlock) {
        const id = makeId();
        await prisma.$executeRaw`
          INSERT INTO "UserBadge" ("id", "userId", "badgeName", "unlockedAt")
          VALUES (${id}, ${userId}, ${badgeName}, NOW())
          ON CONFLICT ("userId", "badgeName") DO NOTHING
        `;
      }
    } catch (dbErr) {
      console.warn("[syncBadges] DB persist error (non-fatal):", dbErr);
    }

    let persistedBadges: Set<string> = new Set();
    try {
      const rows = await prisma.$queryRaw<{ badgeName: string }[]>`
        SELECT "badgeName" FROM "UserBadge" WHERE "userId" = ${userId}
      `;
      persistedBadges = new Set(rows.map((r) => r.badgeName));
    } catch {
      persistedBadges = new Set(
        BADGE_DEFINITIONS.filter((b) => unlockMap[b.name]).map((b) => b.name)
      );
    }

    return BADGE_DEFINITIONS.map((def) => ({
      ...def,
      unlocked: persistedBadges.has(def.name),
    }));
  } catch (err) {
    console.error("[syncBadges] Error:", err);
    return BADGE_DEFINITIONS.map((def) => ({ ...def, unlocked: false }));
  }
}
