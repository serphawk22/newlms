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

export async function GET() {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const templates = await prisma.certificateTemplate.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, fileUrl } = body;

    if (!name || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Sequentially execute to avoid serverless connection pool transaction timeouts
    await prisma.certificateTemplate.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    
    const template = await prisma.certificateTemplate.create({
      data: { name, fileUrl, isActive: true },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing template ID" }, { status: 400 });
    }

    await prisma.certificateTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
