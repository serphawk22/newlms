import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || null,
    cloudinaryUploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || null,
    cloudinaryMaterialsPreset: process.env.NEXT_PUBLIC_CLOUDINARY_MATERIALS_PRESET || process.env.CLOUDINARY_MATERIALS_PRESET || "lms_materials",
    cloudinarySubmissionsPreset: process.env.NEXT_PUBLIC_CLOUDINARY_SUBMISSIONS_PRESET || process.env.CLOUDINARY_SUBMISSIONS_PRESET || "lms_submissions",
  }, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
