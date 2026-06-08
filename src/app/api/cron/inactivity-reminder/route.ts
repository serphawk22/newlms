import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queueEmail } from "@/lib/mail-queue";
import { getStudentInactivityEmailHtml } from "@/lib/mail-templates";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Basic authorization header check to protect this cron endpoint
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thresholds = [14, 7, 3, 1] as const;
    const subjects: Record<(typeof thresholds)[number], string> = {
      1: "We Miss You",
      3: "Your Learning Is Waiting",
      7: "Let's Get Back on Track",
      14: "A Fresh Start Is One Login Away",
    };

    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastLoginAt: {
          lte: oneDayAgo,
          not: null,
        },
        memberships: { some: { role: "STUDENT" } },
      },
    });

    console.log(`[cron/inactivity-reminder] Found ${inactiveUsers.length} inactive users.`);

    for (const user of inactiveUsers) {
      if (!user.lastLoginAt) continue;
      const inactiveDays = Math.floor((now.getTime() - user.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000));
      const threshold = thresholds.find((days) => inactiveDays >= days);
      if (!threshold) continue;

      const type = `INACTIVITY_${threshold}D`;
      const alreadySent = await prisma.emailNotification.findFirst({
        where: {
          userId: user.id,
          type,
          createdAt: { gte: user.lastLoginAt },
        },
        select: { id: true },
      });
      if (alreadySent) continue;

      const lastLoginStr = user.lastLoginAt
        ? user.lastLoginAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
        : "Unknown";

      const html = getStudentInactivityEmailHtml(user.name || user.email, threshold, lastLoginStr);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastReminderSentAt: now,
        },
      });

      await queueEmail({
        userId: user.id,
        toEmail: user.email,
        subject: subjects[threshold],
        type,
        html,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: inactiveUsers.length,
    });
  } catch (error) {
    console.error("[GET /api/cron/inactivity-reminder] Error:", error);
    const message = error instanceof Error ? error.message : "Inactivity reminder processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
