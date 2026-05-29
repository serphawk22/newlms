import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { extractTextFromUrl } from "@/lib/text-extractor";
import { computeSimilarity, type PeerDocument } from "@/lib/similarity";

export const runtime = "nodejs";
export const maxDuration = 60; // allow up to 60s for analysis

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

async function getInstructor() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    if (role !== "INSTRUCTOR" && role !== "ADMIN") return null;
    return payload as { userId: string; role: string; organizationId: string };
  } catch {
    return null;
  }
}

/**
 * POST /api/plagiarism/check
 * Body: { submissionId: string }
 *
 * 1. Marks result as RUNNING
 * 2. Extracts text from target submission file
 * 3. Extracts text from all peer submissions for the same assignment
 * 4. Runs similarity engine
 * 5. Stores result in PlagiarismResult
 */
export async function POST(req: NextRequest) {
  const instructor = await getInstructor();
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { submissionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { submissionId } = body;
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }

  // ── Fetch the target submission ──────────────────────────────────────────
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { select: { id: true, courseId: true } },
      file: true,
      student: { select: { id: true, name: true } },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // ── Create/update PlagiarismResult as RUNNING ───────────────────────────
  await prisma.plagiarismResult.upsert({
    where: { submissionId },
    create: {
      submissionId,
      assignmentId: submission.assignment.id,
      status: "RUNNING",
      similarityScore: 0,
      plagiarismStatus: "SAFE",
      matches: [],
    },
    update: {
      status: "RUNNING",
      errorMessage: null,
    },
  });

  try {
    // ── Resolve target file info ────────────────────────────────────────────
    const targetFile = submission.file;
    const targetUrl = targetFile?.url ?? submission.fileUrl ?? "";
    const targetExt = targetFile?.extension ?? submission.fileType ?? "txt";
    const targetMime = targetFile?.mimeType ?? submission.mimeType ?? "text/plain";

    if (!targetUrl) {
      await prisma.plagiarismResult.update({
        where: { submissionId },
        data: { status: "ERROR", errorMessage: "No file URL found for this submission." },
      });
      return NextResponse.json({ error: "No file URL" }, { status: 422 });
    }

    // ── Extract text from target ────────────────────────────────────────────
    const { text: targetText } = await extractTextFromUrl(targetUrl, targetExt, targetMime);

    if (!targetText.trim()) {
      await prisma.plagiarismResult.update({
        where: { submissionId },
        data: {
          status: "DONE",
          similarityScore: 0,
          plagiarismStatus: "SAFE",
          matches: [],
          extractedText: "",
          checkedAt: new Date(),
        },
      });
      return NextResponse.json({
        status: "DONE",
        similarityScore: 0,
        plagiarismStatus: "SAFE",
        matches: [],
        note: "Could not extract text from this file type.",
      });
    }

    // ── Fetch all other submissions for the same assignment ──────────────────
    const peerSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: submission.assignment.id,
        id: { not: submissionId },       // exclude self
      },
      include: {
        file: true,
        student: { select: { id: true, name: true } },
        plagiarismResult: { select: { extractedText: true } }, // reuse cached text
      },
    });

    // ── Extract text from each peer (reuse cached extractedText if available) ──
    const peers: PeerDocument[] = [];
    const pendingExtractions: { peer: typeof peerSubmissions[0]; url: string; ext: string; mime: string }[] = [];

    for (const peer of peerSubmissions) {
      if (peer.plagiarismResult?.extractedText) {
        peers.push({
          submissionId: peer.id,
          studentName: peer.student.name ?? peer.student.id,
          text: peer.plagiarismResult.extractedText,
          ext: peer.file?.extension ?? peer.fileType ?? "txt",
        });
        continue;
      }

      const peerUrl = peer.file?.url ?? peer.fileUrl ?? "";
      if (!peerUrl) continue;

      const peerExt = peer.file?.extension ?? peer.fileType ?? "txt";
      const peerMime = peer.file?.mimeType ?? peer.mimeType ?? "text/plain";
      pendingExtractions.push({ peer, url: peerUrl, ext: peerExt, mime: peerMime });
    }

    // Batch extract all peer texts in parallel
    const extractionResults = await Promise.all(
      pendingExtractions.map(async ({ peer, url, ext, mime }) => {
        try {
          const { text: peerText } = await extractTextFromUrl(url, ext, mime);
          return { peer, text: peerText };
        } catch {
          return { peer, text: "" };
        }
      }),
    );

    // Batch cache all extracted texts in a single transaction
    await prisma.$transaction(
      extractionResults
        .filter((r) => r.text.trim())
        .map((r) =>
          prisma.plagiarismResult.upsert({
            where: { submissionId: r.peer.id },
            create: {
              submissionId: r.peer.id,
              assignmentId: submission.assignment.id,
              status: "DONE",
              extractedText: r.text.slice(0, 50000),
              similarityScore: 0,
              plagiarismStatus: "SAFE",
              matches: [],
              checkedAt: new Date(),
            },
            update: {
              extractedText: r.text.slice(0, 50000),
            },
          }),
        ),
    );

    for (const r of extractionResults) {
      if (!r.text.trim()) continue;
      const peer = r.peer;
      peers.push({
        submissionId: peer.id,
        studentName: peer.student.name ?? peer.student.id,
        text: r.text,
        ext: peer.file?.extension ?? peer.fileType ?? "txt",
      });
    }

    // ── Run similarity engine ────────────────────────────────────────────────
    const report = computeSimilarity(targetText, targetExt, peers);

    // ── Store result ─────────────────────────────────────────────────────────
    await prisma.plagiarismResult.update({
      where: { submissionId },
      data: {
        status: "DONE",
        similarityScore: report.overallScore,
        plagiarismStatus: report.plagiarismStatus,
        matches: report.matches as object[],
        extractedText: targetText.slice(0, 50000),
        checkedAt: new Date(),
        errorMessage: null,
      },
    });

    return NextResponse.json({
      status: "DONE",
      similarityScore: report.overallScore,
      plagiarismStatus: report.plagiarismStatus,
      matches: report.matches,
    });
  } catch (err) {
    console.error("[POST /api/plagiarism/check]", err);
    await prisma.plagiarismResult.update({
      where: { submissionId },
      data: {
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
