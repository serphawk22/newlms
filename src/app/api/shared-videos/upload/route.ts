import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "default_secret");

async function getUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = formData.get("caption") as string | null;
    const studentName = formData.get("studentName") as string | null;
    const email = formData.get("email") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    if (!studentName || !email) {
      return NextResponse.json({ error: "Student name and email are required" }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create unique filename
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${sanitizedOriginalName}`;
    
    const uploadDir = path.join(process.cwd(), "public", "uploads", "shared-videos");
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    
    const videoUrl = `/uploads/shared-videos/${filename}`;

    // Save to Database
    const sharedVideo = await prisma.sharedVideo.create({
      data: {
        studentName,
        email,
        videoUrl,
        caption: caption || null,
      },
    });

    return NextResponse.json({ message: "Upload successful", video: sharedVideo }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/shared-videos/upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
