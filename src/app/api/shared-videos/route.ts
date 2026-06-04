import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

async function getUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { userId: string; role: string };
  } catch {
    return null;
  }
}

async function destroyCloudinaryAsset(publicId: string, resourceType: string) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("[Cloudinary destroy] Missing API credentials");
    return;
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const crypto = await import("crypto");
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);
  form.append("invalidate", "true");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    { method: "POST", body: form },
  );
  const data = await res.json();
  console.log(`[Cloudinary destroy] ${publicId} (${resourceType}):`, data?.result);
}

function parseCloudinaryUrl(url: string): { publicId: string; resourceType: string } | null {
  const match = url.match(/\/v\d+\/(.+?)\.\w+$/);
  if (!match) return null;
  const fullPath = match[1];
  const parts = fullPath.split("/");
  const resourceType = parts[0] === "lms-shared-videos" ? "video" : "image";
  return { publicId: fullPath, resourceType };
}

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

export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Delete from Cloudinary if it's a Cloudinary URL
    if (video.videoUrl.includes("cloudinary.com")) {
      const parsed = parseCloudinaryUrl(video.videoUrl);
      if (parsed) {
        await destroyCloudinaryAsset(parsed.publicId, parsed.resourceType);
      }
    }

    await prisma.sharedVideo.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Video deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/shared-videos] Error:", error);
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
  }
}
