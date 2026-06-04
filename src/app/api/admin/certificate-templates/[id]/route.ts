import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return false;
  try {
    const verified = await jwtVerify(token, secret);
    if (verified.payload.role !== "ADMIN") return false;
    return true;
  } catch {
    return false;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    // Sequential awaits to avoid Neon serverless transaction timeout (P2028)
    await prisma.certificateTemplate.updateMany({
      where: { id: { not: id } },
      data: { isActive: false },
    });
    const updated = await prisma.certificateTemplate.update({
      where: { id },
      data: { isActive: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error activating template:", error);
    return NextResponse.json({ error: "Failed to activate template" }, { status: 500 });
  }
}

// PATCH: Save field mappings (positions/styles) for a specific template
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { mappings } = body;

    if (!mappings || typeof mappings !== "object") {
      return NextResponse.json({ error: "Invalid mappings data" }, { status: 400 });
    }

    const updated = await prisma.certificateTemplate.update({
      where: { id },
      data: { mappings },
    });

    console.log(`[Certificate Template] Saved mappings for template ${id}:`, JSON.stringify(mappings, null, 2));
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error saving template mappings:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    if (error?.code) console.error("Prisma Error Code:", error.code);
    return NextResponse.json({ error: error?.message || "Failed to save mappings", details: error?.stack }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.certificateTemplate.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
