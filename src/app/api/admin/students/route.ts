import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateUniqueLoginCode } from "@/lib/loginCode";

export const runtime = "nodejs";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getAdminForOrg(orgId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const membership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!membership || membership.role !== "ADMIN") return null;
    return { userId, orgId };
  } catch { return null; }
}

async function getAdminAnyOrg() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const membership = await prisma.organizationMember.findFirst({ where: { userId, role: "ADMIN" } });
    if (!membership) return null;
    return { userId, orgId: membership.organizationId };
  } catch { return null; }
}

/* GET /api/admin/students?orgId= */
export async function GET(req: NextRequest) {
  const orgIdParam = req.nextUrl.searchParams.get("orgId");
  const admin = orgIdParam ? await getAdminForOrg(orgIdParam) : await getAdminAnyOrg();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-cache" } });

  const orgId = orgIdParam || admin.orgId;
  try {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      prisma.organizationMember.findMany({
        where: { organizationId: orgId, role: "STUDENT" },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      prisma.organizationMember.count({
        where: { organizationId: orgId, role: "STUDENT" },
      }),
    ]);
    const students = members.map((m) => ({
      memberId: m.id, userId: m.user.id, name: m.user.name || "Unnamed", email: m.user.email,
    }));
    return NextResponse.json({ students, total, page, limit, pages: Math.ceil(total / limit) }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (err) {
    console.error("[GET /api/admin/students]", err);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500, headers: { "Cache-Control": "no-cache" } });
  }
}

/* POST /api/admin/students  body: { name, email, orgId } */
export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; orgId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { name, email, orgId: orgIdBody } = body;
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const admin = orgIdBody ? await getAdminForOrg(orgIdBody) : await getAdminAnyOrg();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = orgIdBody || admin.orgId;

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const existing = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
      });
      if (existing) return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 });
    }
    let generatedPassword: string | undefined;
    let generatedLoginCode: string | undefined;
    if (!user) {
      generatedPassword = "a1b2c3d4";
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      generatedLoginCode = await generateUniqueLoginCode("STUDENT", prisma);
      user = await prisma.user.create({
        data: { email, name: name || email.split("@")[0], password: hashedPassword, loginCode: generatedLoginCode, status: "ACTIVE" },
      });
    } else {
      generatedPassword = "a1b2c3d4";
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      const updateData: { password: string; loginCode?: string } = { password: hashedPassword };
      if (!user.loginCode) {
        generatedLoginCode = await generateUniqueLoginCode("STUDENT", prisma);
        updateData.loginCode = generatedLoginCode;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }
    const member = await prisma.organizationMember.create({
      data: { userId: user.id, organizationId: orgId, role: "STUDENT" },
      include: { user: { select: { id: true, name: true, email: true, loginCode: true } } },
    });
    return NextResponse.json({
      memberId: member.id, userId: member.user.id, name: member.user.name, email: member.user.email,
      password: generatedPassword,
      loginCode: generatedLoginCode || member.user.loginCode,
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/students]", err);
    return NextResponse.json({ error: "Failed to add student" }, { status: 500 });
  }
}

/* PATCH /api/admin/students  body: { userId, role, orgId } — approve pending user */
export async function PATCH(req: NextRequest) {
  let body: { userId?: string; role?: string; orgId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { userId, role: roleBody, orgId: orgIdBody } = body;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const admin = orgIdBody ? await getAdminForOrg(orgIdBody) : await getAdminAnyOrg();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = orgIdBody || admin.orgId;
  const targetRole = (roleBody?.toUpperCase() as "STUDENT" | "INSTRUCTOR") || "STUDENT";

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (existing) return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 });

    const member = await prisma.organizationMember.create({
      data: { userId, organizationId: orgId, role: targetRole },
      include: { user: { select: { id: true, name: true, email: true, loginCode: true } } },
    });

    return NextResponse.json({
      success: true,
      memberId: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
    }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/admin/students]", err);
    return NextResponse.json({ error: "Failed to approve user" }, { status: 500 });
  }
}

/* DELETE /api/admin/students  body: { memberId, orgId } */
export async function DELETE(req: NextRequest) {
  let body: { memberId?: string; orgId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { memberId, orgId: orgIdBody } = body;
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const admin = orgIdBody ? await getAdminForOrg(orgIdBody) : await getAdminAnyOrg();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: admin.orgId, role: "STUDENT" },
    });
    if (!member) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    await prisma.organizationMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/students]", err);
    return NextResponse.json({ error: "Failed to remove student" }, { status: 500 });
  }
}
