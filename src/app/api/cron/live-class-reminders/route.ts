import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerLiveClassReminderEmail } from "@/lib/email-notifications-helper";

export const runtime = "nodejs";

const WINDOWS = [
  { type: "24H" as const, label: "in 24 hours", minutes: 24 * 60, tolerance: 20 },
  { type: "1H" as const, label: "in 1 hour", minutes: 60, tolerance: 10 },
  { type: "15M" as const, label: "in 15 minutes", minutes: 15, tolerance: 5 },
];

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const maxStart = new Date(now.getTime() + (24 * 60 + 20) * 60 * 1000);
    const minStart = new Date(now.getTime() + 10 * 60 * 1000);

    const sessions = await prisma.liveSession.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          gte: minStart,
          lte: maxStart,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            enrollments: {
              where: { status: "ACTIVE" },
              include: { user: { select: { id: true, email: true } } },
            },
          },
        },
      },
    });

    let processedCount = 0;

    for (const session of sessions) {
      const minutesUntilStart = Math.round((session.scheduledAt.getTime() - now.getTime()) / 60000);
      const reminderWindow = WINDOWS.find(
        (window) =>
          minutesUntilStart <= window.minutes &&
          minutesUntilStart >= window.minutes - window.tolerance
      );

      if (!reminderWindow) continue;

      for (const enrollment of session.course.enrollments) {
        await triggerLiveClassReminderEmail({
          userId: enrollment.user.id,
          toEmail: enrollment.user.email,
          courseName: session.course.title,
          sessionTitle: session.title,
          sessionId: session.id,
          roomId: session.roomId,
          scheduledAt: session.scheduledAt,
          reminderLabel: reminderWindow.label,
          reminderType: reminderWindow.type,
        });
        processedCount++;
      }
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (error) {
    console.error("[GET /api/cron/live-class-reminders] Error:", error);
    const message = error instanceof Error ? error.message : "Live class reminder processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
