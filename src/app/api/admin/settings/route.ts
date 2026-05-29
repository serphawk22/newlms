import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getAdminContext() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const membership = await prisma.organizationMember.findFirst({
      where: { userId, role: "ADMIN" },
      include: { organization: true },
    });
    if (!membership) return null;
    return { userId, orgId: membership.organizationId, org: membership.organization };
  } catch {
    return null;
  }
}

async function ensureExtraColumns() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logo" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "registrationMode" TEXT DEFAULT 'open'`
  );
}

export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureExtraColumns();

  const [rows]: unknown[] = await prisma.$queryRawUnsafe(
    `SELECT "logo", "timezone", "registrationMode" FROM "Organization" WHERE "id" = $1`,
    ctx.orgId
  );
  const extra = rows as { logo: string | null; timezone: string | null; registrationMode: string | null } | undefined;

  return NextResponse.json({
    id: ctx.org.id,
    name: ctx.org.name,
    slug: ctx.org.slug,
    logo: extra?.logo ?? null,
    timezone: extra?.timezone ?? "UTC",
    registrationMode: extra?.registrationMode ?? "open",
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; logo?: string | null; timezone?: string; registrationMode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, logo, timezone, registrationMode } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  if (registrationMode && !["open", "invite"].includes(registrationMode)) {
    return NextResponse.json({ error: "Invalid registration mode" }, { status: 400 });
  }

  await ensureExtraColumns();

  await prisma.organization.update({
    where: { id: ctx.orgId },
    data: { name: name.trim() },
  });

  if (logo !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Organization" SET "logo" = $1 WHERE "id" = $2`,
      logo,
      ctx.orgId
    );
  }

  if (timezone !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Organization" SET "timezone" = $1 WHERE "id" = $2`,
      timezone,
      ctx.orgId
    );
  }

  if (registrationMode !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Organization" SET "registrationMode" = $1 WHERE "id" = $2`,
      registrationMode,
      ctx.orgId
    );
  }

  return NextResponse.json({ success: true, name: name.trim(), logo, timezone, registrationMode });
}
