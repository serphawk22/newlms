import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getInstructor() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    if (role !== "INSTRUCTOR" && role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

/** GET /api/plagiarism/result/[submissionId] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const instructor = await getInstructor();
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-cache" } });
  }

  const { submissionId } = await params;

  const result = await prisma.plagiarismResult.findUnique({
    where: { submissionId },
    select: {
      id: true,
      submissionId: true,
      status: true,
      similarityScore: true,
      plagiarismStatus: true,
      matches: true,
      errorMessage: true,
      checkedAt: true,
      updatedAt: true,
    },
  });

  if (!result) {
    return NextResponse.json({ result: null }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  }

  return NextResponse.json({ result }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
}
