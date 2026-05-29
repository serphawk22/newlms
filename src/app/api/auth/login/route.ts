import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

// Force Node.js runtime — bcryptjs + Prisma pg adapter need native Node modules.
export const runtime = "nodejs";

const ROLE_COOKIE: Record<Role, string> = {
  STUDENT: "student_token",
  INSTRUCTOR: "instructor_token",
  ADMIN: "admin_token",
};

const ROLE_REDIRECT: Record<Role, string> = {
  STUDENT: "/student",
  INSTRUCTOR: "/instructor",
  ADMIN: "/admin",
};

export async function POST(req: Request) {
  try {
    if (!process.env.JWT_SECRET) {
      return NextResponse.json({ error: "JWT_SECRET not configured" }, { status: 500 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
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

    // ── 4. Check organisation membership ──────────────────────────────────
    const primaryMembership =
      (expectedRole ? user.memberships.find((membership) => membership.role === expectedRole) : null) ??
      user.memberships[0];

    if (!primaryMembership) {
      return NextResponse.json({ error: "No organization assigned" }, { status: 403 });
    }

    if (expectedRole && primaryMembership.role !== expectedRole) {
      return NextResponse.json({ error: `This account is not authorized for ${expectedRole.toLowerCase()} access` }, { status: 403 });
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

    // ── 6. Track daily login streak (after successful auth) ───────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLogin = await prisma.notification.findFirst({
      where: { userId: user.id, type: "LOGIN", createdAt: { gte: today } },
    });

    if (!existingLogin) {
      await prisma.notification.create({
        data: { userId: user.id, message: "Daily Login", type: "LOGIN" },
      });
    }

    // Reuse an existing session token so signing into another role does not
    // invalidate a role session that is already open in this browser.
    const sessionToken = user.sessionToken ?? crypto.randomUUID();

    if (!user.sessionToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionToken },
      });
    }

    // ── 8. Issue JWT (with sessionToken embedded in payload) ───────────────
    const org = await prisma.organization.findUnique({
      where: { id: primaryMembership.organizationId },
      select: { name: true },
    });

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name ?? "",
      role: primaryMembership.role,
      organizationId: primaryMembership.organizationId,
      organizationName: org?.name ?? "",
      sessionToken,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    } as const;

    cookieStore.set(ROLE_COOKIE[primaryMembership.role], token, cookieOptions);
    cookieStore.set("token", token, cookieOptions);

    const redirectTo = ROLE_REDIRECT[primaryMembership.role];

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
