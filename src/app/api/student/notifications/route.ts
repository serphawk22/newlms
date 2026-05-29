import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "@/lib/notifications";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

type RawNotification = {
  id: string;
  userId: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
};

async function getAuthUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

async function fetchNotifications(userId: string) {
  await ensureTablesExist();
  const notifications = await prisma.$queryRaw<RawNotification[]>`
    SELECT "id", "userId", "message", "type", "link", "isRead", "createdAt"
    FROM "Notification"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT 20
  `;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return {
    notifications: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    })),
    unreadCount,
  };
}

// GET /api/student/notifications — SSE endpoint for real-time notifications
export async function GET(req: NextRequest) {
  const rawUserId = await getAuthUser();
  if (!rawUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId: string = rawUserId;

  const acceptHeader = req.headers.get("accept") || "";
  const isSSE = acceptHeader.includes("text/event-stream");

  if (!isSSE) {
    // Standard JSON response for backward compatibility
    try {
      const data = await fetchNotifications(userId);
      return NextResponse.json(data, { headers: { "Cache-Control": "no-cache" } });
    } catch (err) {
      console.error("[GET /api/student/notifications] Error:", err);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
  }

  // SSE streaming response
  const encoder = new TextEncoder();
  let lastUnreadCount = 0;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      async function push() {
        if (closed) return;
        try {
          const data = await fetchNotifications(userId);
          if (data.unreadCount !== lastUnreadCount || closed) {
            lastUnreadCount = data.unreadCount;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }
        } catch {
          // silent
        }
        if (!closed) {
          setTimeout(push, 30000);
        }
      }
      // Push initial data immediately
      fetchNotifications(userId).then((data) => {
        if (closed) return;
        lastUnreadCount = data.unreadCount;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        setTimeout(push, 30000);
      }).catch(() => {
        // silent
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// PATCH /api/student/notifications — mark one or all as read
// Body: { id: string } to mark one, or { all: true } to mark all
export async function PATCH(req: NextRequest) {
  const userId = await getAuthUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureTablesExist();
    const body = await req.json();

    if (body.all === true) {
      await prisma.$executeRaw`
        UPDATE "Notification"
        SET "isRead" = true
        WHERE "userId" = ${userId} AND "isRead" = false
      `;
      return NextResponse.json({ success: true, message: "All marked as read" });
    }

    if (body.id) {
      // Verify the notification belongs to this user before updating
      const rows = await prisma.$queryRaw<{ userId: string }[]>`
        SELECT "userId" FROM "Notification" WHERE "id" = ${body.id} LIMIT 1
      `;
      if (rows.length === 0 || rows[0].userId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await prisma.$executeRaw`
        UPDATE "Notification" SET "isRead" = true WHERE "id" = ${body.id}
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing id or all flag" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/student/notifications] Error:", err);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
