import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

// Large video uploads require a higher body size limit
export const maxDuration = 120; // seconds

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
  folder: string
): Promise<{ secureUrl: string; duration: number | null }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured");
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const publicId = `recording_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const signatureString = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const crypto = await import("crypto");
  const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength)], {
      type: "video/webm",
    }),
    fileName
  );
  form.append("public_id", publicId);
  form.append("folder", folder);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);
  form.append("resource_type", "video");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }

  return {
    secureUrl: data.secure_url as string,
    duration: typeof data.duration === "number" ? Math.round(data.duration) : null,
  };
}

// POST /api/instructor/record-video
// Body (multipart): file, courseId, moduleId, lessonId, title, duration?
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const courseId = formData.get("courseId") as string | null;
    const moduleId = formData.get("moduleId") as string | null;
    const lessonId = formData.get("lessonId") as string | null;
    const title = (formData.get("title") as string | null)?.trim();
    const durationStr = formData.get("duration") as string | null;

    if (!file || !courseId || !moduleId || !lessonId || !title) {
      return NextResponse.json(
        { error: "file, courseId, moduleId, lessonId, and title are required" },
        { status: 400 }
      );
    }

    // Verify course ownership (instructors can only record for their own courses)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true, title: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && course.creatorId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify lesson exists and belongs to this module/course
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, moduleId },
      select: { id: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = "lms-instructor-recordings";
    const { secureUrl, duration: cloudDuration } = await uploadToCloudinary(
      buffer,
      file.name || "recording.webm",
      folder
    );

    const duration = cloudDuration ?? (durationStr ? parseInt(durationStr, 10) : null);

    // Save to AdminReviewVideo table (shown in admin Learning Videos → Instructor Lesson Videos tab)
    const adminVideo = await prisma.adminReviewVideo.create({
      data: {
        courseId,
        moduleId,
        lessonId,
        instructorId: user.userId,
        videoUrl: secureUrl,
        status: "PENDING",
      },
    });

    // Also save to RecordedClass so it appears in the course's Recorded Videos tab
    await prisma.recordedClass.create({
      data: {
        courseId,
        moduleId,
        instructorId: user.userId,
        title,
        videoUrl: secureUrl,
        duration: duration ?? null,
      },
    });

    return NextResponse.json(
      { message: "Recording saved successfully", id: adminVideo.id, videoUrl: secureUrl },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/instructor/record-video]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
