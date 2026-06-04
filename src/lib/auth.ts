import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import type { Role } from "@prisma/client";

export const ROLE_COOKIE: Record<Role, string> = {
  STUDENT: "student_token",
  INSTRUCTOR: "instructor_token",
  ADMIN: "admin_token",
};

export const ROLE_REDIRECT: Record<Role, string> = {
  STUDENT: "/student",
  INSTRUCTOR: "/instructor",
  ADMIN: "/admin",
};

export async function generateSessionJwt(
  user: { id: string; email: string; name: string | null; sessionToken: string | null },
  primaryMembership: { role: Role; organizationId: string }
) {
  // If sessionToken is missing or is a legacy status value, generate a fresh UUID
  const needsNewToken = !user.sessionToken || user.sessionToken === "PENDING" || user.sessionToken === "SUSPENDED";
  let sessionToken = user.sessionToken;

  if (needsNewToken) {
    sessionToken = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionToken },
    });
  }

  const org = await prisma.organization.findUnique({
    where: { id: primaryMembership.organizationId },
    select: { name: true },
  });

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

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

  console.log("[generateSessionJwt] JWT created for user:", user.id, "role:", primaryMembership.role, "sessionToken:", sessionToken?.substring(0, 12) + "...");

  return { sessionToken, token };
}

export async function issueAuthSession(
  user: { id: string; email: string; name: string | null; sessionToken: string | null },
  primaryMembership: { role: Role; organizationId: string }
) {
  // 1. Track daily login streak
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

  // 2. Generate JWT
  const { token } = await generateSessionJwt(user, primaryMembership);

  // 3. Set Cookies
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

  // 4. Return standard redirect URL
  return ROLE_REDIRECT[primaryMembership.role];
}
