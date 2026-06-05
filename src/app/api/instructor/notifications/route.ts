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
    const userId = payload.userId as string;
    
    // Verify user is an instructor or admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        memberships: {
          select: { role: true }
        }
      }
    });

    if (!user || user.memberships.length === 0) return null;
    const role = user.memberships[0].role;
    if (role !== "INSTRUCTOR" && role !== "ADMIN") return null;

    return userId;
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
    LIMIT 25
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

export async function GET(req: NextRequest) {
  const userId = await getAuthUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const acceptHeader = req.headers.get("accept") || "";
  const isSSE = acceptHeader.includes("text/event-stream");

  if (!isSSE) {
    try {
      const data = await fetchNotifications(userId);
      return NextResponse.json(data, { headers: { "Cache-Control": "no-cache" } });
    } catch (err) {
      console.error("[GET /api/instructor/notifications] Error:", err);
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
          const activeUserId = userId;
          if (!activeUserId) return;
          const data = await fetchNotifications(activeUserId);
          if (data.unreadCount !== lastUnreadCount || closed) {
            lastUnreadCount = data.unreadCount;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }
        } catch {
          // silent
        }
        if (!closed) {
          setTimeout(push, 25000);
        }
      }
      fetchNotifications(userId).then((data) => {
        if (closed) return;
        lastUnreadCount = data.unreadCount;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        setTimeout(push, 25000);
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
    console.error("[PATCH /api/instructor/notifications] Error:", err);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
