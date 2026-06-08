import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateUniqueLoginCode } from "@/lib/loginCode";
import { issueAuthSession } from "@/lib/auth";
import { notifyAdminNewRegistration } from "@/lib/notifications-service";

// Force Node.js runtime — bcryptjs + Prisma pg adapter need native Node modules
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let { email, password, name, code, requestedRole } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // If no code was provided, auto-select based on requestedRole
    if (!code) {
      const firstOrg = await prisma.organization.findFirst();
      if (!firstOrg) {
        return NextResponse.json({ error: "No organization found in database to join" }, { status: 400 });
      }
      if (requestedRole === "INSTRUCTOR") {
        code = firstOrg.instructorCode;
      } else if (requestedRole === "ADMIN") {
        code = firstOrg.adminCode;
      } else {
        code = firstOrg.joinCode;
      }
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least 1 number" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least 1 uppercase letter" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Find organization by matching code against all three code types
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { joinCode: code },
          { instructorCode: code },
          { adminCode: code }
        ]
      }
    });

    if (!org) {
      return NextResponse.json({ error: "Invalid registration code" }, { status: 400 });
    }

    // Determine role based on which code matched
    let assignedRole: "STUDENT" | "INSTRUCTOR" | "ADMIN";
    if (code === org.joinCode) {
      assignedRole = "STUDENT";
    } else if (code === org.instructorCode) {
      assignedRole = "INSTRUCTOR";
    } else if (code === org.adminCode) {
      // Check if admin already exists for this org
      const existingAdmin = await prisma.organizationMember.findFirst({
        where: {
          organizationId: org.id,
          role: "ADMIN"
        }
      });
      
      if (existingAdmin) {
        return NextResponse.json({ error: "Admin already exists for this organization" }, { status: 400 });
      }
      assignedRole = "ADMIN";
    } else {
      return NextResponse.json({ error: "Invalid registration code" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const loginCode = await generateUniqueLoginCode(assignedRole, prisma);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        loginCode,
        status: assignedRole === "INSTRUCTOR" ? "PENDING" : "ACTIVE",
        memberships: {
          create: {
            organizationId: org.id,
            role: assignedRole,
          },
        },
      },
    });

    notifyAdminNewRegistration({
      organizationId: org.id,
      userName: newUser.name,
      role: assignedRole,
    });

    if (assignedRole === "STUDENT" || assignedRole === "ADMIN") {
      const redirectUrl = await issueAuthSession(
        { id: newUser.id, email: newUser.email, name: newUser.name, sessionToken: newUser.sessionToken },
        { role: assignedRole, organizationId: org.id }
      );

      return NextResponse.json(
        {
          message: "Registration successful",
          loginCode: newUser.loginCode,
          role: assignedRole,
          redirect: redirectUrl,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        message: "Registration submitted. Awaiting administrator approval.",
        loginCode: newUser.loginCode,
        role: assignedRole,
        pendingApproval: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
