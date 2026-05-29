import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-cache" } });
  }

  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get("messageLimit") ?? "100", 10) || 100));

    const session = await prisma.studyFriendSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: limit,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404, headers: { "Cache-Control": "no-cache" } });
    }

    return NextResponse.json(session, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error: any) {
    console.error("[GET /api/study-friend/sessions/[sessionId]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500, headers: { "Cache-Control": "no-cache" } });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = await prisma.studyFriendSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.studyFriendSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/study-friend/sessions/[sessionId]] Error:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
