import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime — Prisma pg adapter needs native Node modules.
export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

/**
 * POST /api/auth/verify-session
 *
 * Called by the Next.js middleware on every protected request.
 * Validates that the JWT's embedded sessionToken matches the one
 * currently stored in the database for this user.
 *
 * Returns:
 *   200 OK              — session is valid
 *   401 { error: "another_device" }  — token mismatch (logged in elsewhere)
 *   401 { error: "session_expired" } — JWT is expired or invalid
 */
export async function POST(req: NextRequest) {
  try {
    // Read the token from the Authorization header (set by middleware)
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }

    // Verify JWT signature and expiry
    let payload: {
      userId: string;
      sessionToken?: string;
      [key: string]: unknown;
    };

    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload as typeof payload;
    } catch {
      // JWT is expired, malformed, or tampered with
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }

    const { userId, sessionToken: tokenSessionToken } = payload;

    if (!userId) {
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }

    // Fetch the user's current session token from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sessionToken: true },
    });

    if (!user) {
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }

    // Compare: if the DB token doesn't match the JWT's token,
    // the user has logged in from another device since this JWT was issued.
    if (!user.sessionToken || user.sessionToken !== tokenSessionToken) {
      return NextResponse.json({ error: "another_device" }, { status: 401 });
    }

    // Session is valid
    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/auth/verify-session] Error:", err);
    return NextResponse.json({ error: "session_expired" }, { status: 500 });
  }
}
