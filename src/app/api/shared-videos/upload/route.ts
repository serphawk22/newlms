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

async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured");
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const folder = "lms-shared-videos";
  const publicId = `shared_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const signatureString = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const crypto = await import("crypto");
  const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength) as BlobPart], { type: "video/mp4" }), fileName);
  form.append("public_id", publicId);
  form.append("folder", folder);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);
  form.append("resource_type", "video");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }

  return data.secure_url as string;
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const videoUrl = await uploadToCloudinary(buffer, file.name);

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
