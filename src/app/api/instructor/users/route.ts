import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const runtime = "nodejs";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getInstructorContext() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const membership = await prisma.organizationMember.findFirst({
      where: { userId, role: { in: ["ADMIN", "INSTRUCTOR"] } },
    });
    if (!membership) return null;
    return { userId, orgId: membership.organizationId };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, email, role = "STUDENT" } = body;
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const ctx = await getInstructorContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const existing = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId: ctx.orgId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 409 }
        );
      }
    }
    let generatedPassword: string | undefined;
    if (!user) {
      generatedPassword = crypto.randomBytes(4).toString("hex");
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          password: hashedPassword,
        },
      });
    }
    const member = await prisma.organizationMember.create({
      data: { userId: user.id, organizationId: ctx.orgId, role: role as Role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(
      {
        memberId: member.id,
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role,
        ...(generatedPassword ? { password: generatedPassword } : {}),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/instructor/users]", err);
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  }
}
