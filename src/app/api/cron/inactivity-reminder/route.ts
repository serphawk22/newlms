import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queueEmail } from "@/lib/mail-queue";
import { getInactivityEmailHtml } from "@/lib/mail-templates";

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

    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastLoginAt: {
          lte: oneDayAgo,
          not: null,
        },
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lte: oneDayAgo } },
        ],
      },
    });

    console.log(`[cron/inactivity-reminder] Found ${inactiveUsers.length} inactive users.`);

    for (const user of inactiveUsers) {
      const lastLoginStr = user.lastLoginAt
        ? user.lastLoginAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
        : "Unknown";

      const html = getInactivityEmailHtml(user.name || user.email, lastLoginStr);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastReminderSentAt: now,
        },
      });

      await queueEmail({
        userId: user.id,
        toEmail: user.email,
        subject: "We Miss You at SERP LMS!",
        type: "INACTIVITY",
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
