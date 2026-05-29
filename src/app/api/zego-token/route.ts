import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { generateKitToken } from "@/lib/zego-token";

export const runtime = "nodejs";

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function GET(request: NextRequest) {
  // ── Auth guard — only authenticated users may join a room ──────────────────
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-cache" } });
  }
  try {
    await jwtVerify(token, getSecret());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-cache" } });
  }

  const { searchParams } = new URL(request.url);
  const roomId   = searchParams.get("roomId")   ?? "";
  const userId   = searchParams.get("userId")   ?? "";
  const userName = searchParams.get("userName") ?? "User";

  if (!roomId || !userId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400, headers: { "Cache-Control": "no-cache" } });
  }

  const appId        = parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID ?? "0", 10);
  const serverSecret = process.env.ZEGO_SERVER_SECRET ?? "";

  if (!appId || !serverSecret) {
    return NextResponse.json({ error: "ZEGOCLOUD not configured" }, { status: 500, headers: { "Cache-Control": "no-cache" } });
  }

  // Generate the kit token entirely on the server — serverSecret never reaches the browser.
  const kitToken = generateKitToken(appId, serverSecret, userId, roomId, userName);

  return NextResponse.json({ kitToken, appId }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
}
