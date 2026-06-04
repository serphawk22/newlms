import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { issueAuthSession } from "@/lib/auth";

// Force Node.js runtime — bcryptjs + Prisma pg adapter need native Node modules.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!process.env.JWT_SECRET) {
      return NextResponse.json({ error: "JWT_SECRET not configured" }, { status: 500 });
    }

    const { email, password, loginCode, requestedRole } = await req.json();
    const expectedRole = typeof requestedRole === "string" ? requestedRole.toUpperCase() as Role : null;

    if (expectedRole && !["STUDENT", "INSTRUCTOR", "ADMIN"].includes(expectedRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // ── 1. Validate required fields ────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (!loginCode?.trim()) {
      return NextResponse.json({ error: "Login Code is required" }, { status: 400 });
    }

    // ── 2. Look up the user ────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    // ── 3. Validate password ───────────────────────────────────────────────
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // ── 3b. Check membership status ───────────────────────────────────────
    const primaryMembership =
      (expectedRole ? user.memberships.find((membership) => membership.role === expectedRole) : null) ??
      user.memberships[0];

    if (!primaryMembership) {
      if (user.memberships.length === 0) {
        return NextResponse.json({ error: "Your account is awaiting administrator approval." }, { status: 403 });
      }
      return NextResponse.json({ error: `This account is not authorized for ${expectedRole!.toLowerCase()} access` }, { status: 403 });
    }

    // ── 4. Validate login code ─────────────────────────────────────────────
    // Existing users created before this feature have loginCode = null.
    // We allow them in with any code so they are not locked out,
    // but NEW users always have a code enforced.
    const codeValid =
      user.loginCode === null ||
      user.loginCode === loginCode.trim().toUpperCase();

    // Also allow the organization's role-specific codes as login codes
    if (!codeValid) {
      const org = await prisma.organization.findUnique({
        where: { id: primaryMembership.organizationId },
        select: { joinCode: true, instructorCode: true, adminCode: true },
      });
      const orgCodeValid =
        org &&
        (loginCode.trim().toUpperCase() === org.joinCode ||
          loginCode.trim().toUpperCase() === org.instructorCode ||
          loginCode.trim().toUpperCase() === org.adminCode);
      if (!orgCodeValid) {
        return NextResponse.json({ error: "Invalid Login Code" }, { status: 401 });
      }
    }

    const redirectTo = await issueAuthSession(user, primaryMembership);

    return NextResponse.json(
      { message: "Login successful", role: primaryMembership.role, redirect: redirectTo },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/auth/login] Error:", error);
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message, details: message }, { status: 500 });
  }
}
