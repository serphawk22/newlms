import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { ROLE_COOKIE, ROLE_REDIRECT } from "@/lib/auth";
import { queueEmail } from "@/lib/mail-queue";
import { getLoginEmailHtml } from "@/lib/mail-templates";

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
    if (expectedRole !== "ADMIN" && !loginCode?.trim()) {
      return NextResponse.json({ error: "Login Code is required" }, { status: 400 });
    }

    // ── 2. Look up the user ────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email },
      include: { 
        memberships: {
          include: { organization: true }
        }
      },
    });

    // ── 3. Validate password ───────────────────────────────────────────────
    if (!user) {
      return NextResponse.json({ error: "Account not found. Please create an account." }, { status: 404 });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status === "PENDING") {
      return NextResponse.json({ error: "Your account is awaiting administrator approval." }, { status: 403 });
    }

    if (user.status === "REJECTED") {
      return NextResponse.json({ error: "Your account has been rejected." }, { status: 403 });
    }


    // ── 4. Check organisation membership ──────────────────────────────────
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
    if (expectedRole !== "ADMIN") {
      const codeValid =
        user.loginCode === null ||
        (loginCode && user.loginCode === loginCode.trim().toUpperCase());

      // Also allow the organization's role-specific codes as login codes
      if (!codeValid) {
        const org = primaryMembership.organization;
        const orgCodeValid =
          org &&
          loginCode &&
          (loginCode.trim().toUpperCase() === org.joinCode ||
            loginCode.trim().toUpperCase() === org.instructorCode ||
            loginCode.trim().toUpperCase() === org.adminCode);
        if (!orgCodeValid) {
          return NextResponse.json({ error: "Invalid Login Code" }, { status: 401 });
        }
      }
    }

    // ── 6. Track daily login streak & Update Session ──────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionToken = user.sessionToken ?? crypto.randomUUID();
    const userAgent = req.headers.get("user-agent") || "Unknown Browser/Device";
    const loginDateTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";

    await Promise.all([
      // Check/create daily login streak
      prisma.notification.findFirst({
        where: { userId: user.id, type: "LOGIN", createdAt: { gte: today } },
      }).then(existingLogin => {
        if (!existingLogin) {
          return prisma.notification.create({
            data: { userId: user.id, message: "Daily Login", type: "LOGIN" },
          });
        }
      }),
      // Update session token and lastLoginAt
      prisma.user.update({
        where: { id: user.id },
        data: {
          sessionToken,
          lastLoginAt: new Date(),
        },
      }),
      // Queue successful login email notification immediately
      queueEmail({
        userId: user.id,
        toEmail: user.email,
        subject: "Successful Login to LMS",
        type: "LOGIN",
        html: getLoginEmailHtml(
          user.name || user.email,
          primaryMembership.role,
          loginDateTime,
          userAgent
        ),
      }),
    ]);

    // ── 8. Issue JWT (with sessionToken embedded in payload) ───────────────
    const org = primaryMembership.organization;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

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
