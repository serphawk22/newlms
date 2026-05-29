import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import crypto from "crypto";

if (!process.env.OPENAI_API_KEY) {
  console.error("[StudyFriend] Missing OPENAI_API_KEY environment variable");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sessionId, message } = body as {
      sessionId: string;
      message: string;
    };

    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ error: "Session ID and message are required" }, { status: 400 });
    }

    // Load session and verify user owns it
    const session = await prisma.studyFriendSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch message history for context (last 15 messages)
    const history = await prisma.studyFriendMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 15,
    });

    // Save user message to DB (non-blocking — fire and forget after history fetch)
    const saveUserMsg = prisma.studyFriendMessage.create({
      data: {
        sessionId,
        role: "user",
        content: message.trim(),
      },
    });

    // Format history for OpenAI
    const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = history.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }));

    // Grounding prompt — truncate doc to ~80k chars to stay under the 128k token limit
    // (~80k chars ≈ ~20k tokens; system prompt + history leave the rest of the budget)
    const MAX_DOC_CHARS = 80000;
    const rawDocText = session.extractedText || "[The document is empty or text could not be extracted]";
    const docText = rawDocText.length > MAX_DOC_CHARS
      ? rawDocText.slice(0, MAX_DOC_CHARS) + "\n\n[Note: Document was truncated to fit context limits. The above represents the first portion of the document.]"
      : rawDocText;

    const systemPrompt = `You are 'Study Friend', a helpful and friendly AI study assistant. 
Your task is to answer the user's questions based STRICTLY on the content of the uploaded document provided below.
Do not use any outside knowledge or general knowledge that cannot be directly verified from the document.
If the answer to the user's question cannot be found or reasonably inferred from the document text, you must refuse to answer and politely explain that you can only answer questions related to the uploaded document content.
When asked to summarize, provide a clear and structured summary of the document content.

Document Content:
"""
${docText}
"""

Always keep your tone encouraging, professional, and clear.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...openAiMessages.slice(-8), // Use only the last 8 messages to stay within token budget
    ];

    const promptString = JSON.stringify(messages).trim().toLowerCase();
    const promptHash = crypto.createHash("sha256").update(promptString).digest("hex");

    let reply = "";

    const cached = await prisma.promptCache.findUnique({
      where: { promptHash },
    });

    if (cached) {
      reply = cached.response;
    } else {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.2, // Low temperature for higher fidelity to the grounding document
      });

      reply = response.choices[0]?.message?.content || "I'm sorry, I could not generate a response.";

      if (reply !== "I'm sorry, I could not generate a response.") {
        try {
          await prisma.promptCache.create({
            data: {
              promptHash,
              prompt: promptString.slice(0, 50000),
              response: reply,
            },
          });
        } catch { /* ignore caching errors */ }
      }
    }

    // Await user message save, then parallelize assistant reply save + session update
    await saveUserMsg;

    const [savedReply] = await Promise.all([
      prisma.studyFriendMessage.create({
        data: { sessionId, role: "assistant", content: reply },
      }),
      prisma.studyFriendSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(savedReply);
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || "Unknown error",
      status: error?.status || error?.statusCode || 500,
      type: error?.type || error?.name || "Unknown",
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    };

    console.error("[POST /api/study-friend/chat] Error:", JSON.stringify(errorDetails, null, 2));

    // Check for specific OpenAI errors
    if (error?.status === 401 || error?.code === "invalid_api_key") {
      return NextResponse.json({
        error: "AI service configuration error. Please contact support.",
        code: "AI_CONFIG_ERROR",
      }, { status: 500 });
    }

    if (error?.status === 429) {
      return NextResponse.json({
        error: "AI is temporarily unavailable due to high demand, please try again.",
        code: "RATE_LIMITED",
      }, { status: 429 });
    }

    if (error?.code === "insufficient_quota") {
      return NextResponse.json({
        error: "AI service quota exceeded. Please contact support.",
        code: "QUOTA_EXCEEDED",
      }, { status: 500 });
    }

    return NextResponse.json({
      error: "AI is temporarily unavailable, please try again.",
      code: "AI_UNAVAILABLE",
    }, { status: 500 });
  }
}
