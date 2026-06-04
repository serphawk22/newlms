import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateUniqueLoginCode } from "@/lib/loginCode";

// Force Node.js runtime — bcryptjs + Prisma pg adapter need native Node modules
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let { email, password, name, code } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!code) {
      const firstOrg = await prisma.organization.findFirst();
      if (!firstOrg) {
        return NextResponse.json({ error: "No organization found in database to join" }, { status: 400 });
      }
      code = firstOrg.joinCode;
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

    // Generate a unique login code for this user
    const loginCode = await generateUniqueLoginCode(assignedRole, prisma);

    // Only admins get immediate access (admin code acts as authorization).
    // Students and instructors require approval.
    const membershipData = assignedRole === "ADMIN"
      ? {
          memberships: {
            create: {
              organizationId: org.id,
              role: assignedRole,
            },
          },
        }
      : {};

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        loginCode,
        ...membershipData,
      },
    });

    return NextResponse.json(
      {
        message: assignedRole === "ADMIN"
          ? "Registration successful"
          : "Registration submitted. Awaiting administrator approval.",
        loginCode: newUser.loginCode,
        role: assignedRole,
        pendingApproval: assignedRole !== "ADMIN",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
