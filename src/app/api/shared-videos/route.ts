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

// GET /api/shared-videos
// Retrieve all videos. Authenticated users only.
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      prisma.sharedVideo.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: { id: true, studentName: true, email: true, videoUrl: true, caption: true, createdAt: true },
      }),
      prisma.sharedVideo.count(),
    ]);
    return NextResponse.json({ videos, total, page, limit, pages: Math.ceil(total / limit) }, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[GET /api/shared-videos] Error:", error);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}

// DELETE /api/shared-videos?id=xxx
// Delete a video. Instructors or Admins only.
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Restrict deletions to INSTRUCTOR or ADMIN roles
  if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
  }

  try {
    const video = await prisma.sharedVideo.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Delete local file from disk if it exists
    if (video.videoUrl.startsWith("/uploads/shared-videos/")) {
      const filename = video.videoUrl.replace("/uploads/shared-videos/", "");
      const filePath = path.join(process.cwd(), "public", "uploads", "shared-videos", filename);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`File not found on disk during deletion: ${filePath}`, err);
      }
    }

    // Delete record from DB
    await prisma.sharedVideo.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Video deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/shared-videos] Error:", error);
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
  }
}
