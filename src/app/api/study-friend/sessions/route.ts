import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { extractTextFromUrl } from "@/lib/text-extractor";
import pdf from "pdf-parse";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-cache" } });
  }

  try {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.studyFriendSession.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          fileName: true,
          fileUrl: true,
          fileExt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { messages: true }
          }
        }
      }),
      prisma.studyFriendSession.count({ where: { userId } }),
    ]);

    return NextResponse.json({ sessions, total, page, limit, pages: Math.ceil(total / limit) }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error: any) {
    console.error("[GET /api/study-friend/sessions] Error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500, headers: { "Cache-Control": "no-cache" } });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const fileUrl = formData.get("fileUrl") as string | null;
    const fileName = formData.get("fileName") as string | null;
    const fileExt = formData.get("fileExt") as string | null;
    const fileMime = formData.get("fileMime") as string | null;
    const file = formData.get("file") as File | null;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let extractedText = "";

    // Strategy 1: Use raw file buffer sent directly from the browser (bypasses Cloudinary block)
    if (file && fileMime) {
      try {
        const normalMime = fileMime.toLowerCase();
        const normalExt = (fileExt || "").toLowerCase().replace(/^\./, "");
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (normalMime === "application/pdf" || normalExt === "pdf") {
          const result = await pdf(buffer);
          extractedText = result.text?.replace(/\u0000/g, "").trim() || "";
          console.log(`[study-friend/sessions] PDF extracted from FormData: ${extractedText.length} chars`);
        } else if (normalMime.startsWith("text/")) {
          extractedText = buffer.toString("utf-8").slice(0, 100000);
        }
      } catch (fileErr) {
        console.error("[POST /api/study-friend/sessions] File buffer extraction failed:", fileErr);
      }
    }

    // Strategy 2: Fallback — fetch from Cloudinary URL (may fail for PDFs if Cloudinary delivery is blocked)
    if (!extractedText && fileUrl && fileExt && fileMime) {
      try {
        const extraction = await extractTextFromUrl(fileUrl, fileExt, fileMime);
        if (extraction.text) {
          extractedText = extraction.text;
        } else {
          console.warn("[POST /api/study-friend/sessions] Empty text extracted or error method:", extraction.method);
          extractedText = `[Metadata: File could not be fully extracted. Method: ${extraction.method}]`;
        }
      } catch (extractErr) {
        console.error("[POST /api/study-friend/sessions] Text extraction exception:", extractErr);
        extractedText = "[Extraction failed due to server error]";
      }
    }

    // Sanitize null bytes (\u0000) which PostgreSQL does not support in text fields
    const sanitizedText = extractedText.replace(/\u0000/g, "");

    const session = await prisma.studyFriendSession.create({
      data: {
        userId,
        title: title.trim(),
        fileUrl,
        fileName,
        fileExt,
        extractedText: sanitizedText,
      },
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("[POST /api/study-friend/sessions] Error:", error);
    return NextResponse.json({ error: "Failed to create session: " + (error?.message || String(error)) }, { status: 500 });
  }
}
