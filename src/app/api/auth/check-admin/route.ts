import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime — Prisma pg adapter needs native Node modules
export const runtime = "nodejs";

/**
 * GET /api/auth/check-admin
 * Returns { adminExists: boolean }
 * Used to conditionally show the first-time admin setup flow.
 */
export async function GET() {
  try {
    const adminMember = await prisma.organizationMember.findFirst({
      where: { role: "ADMIN" },
    });
    return NextResponse.json({ adminExists: !!adminMember });
  } catch (error) {
    console.error("[GET /api/auth/check-admin] Error:", error);
    return NextResponse.json({ error: "Failed to check admin status" }, { status: 500 });
  }
}
