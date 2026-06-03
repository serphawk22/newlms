import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// ── Reuse the same OpenAI instance / key already in the project ──────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export const runtime = "nodejs";

// ── Simple in-memory rate limiter (shared logic, separate counter) ────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getSession(): Promise<{ userId: string; role: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      role: (payload.role as string) ?? "STUDENT",
      name: (payload.name as string) ?? "User",
    };
  } catch {
    return null;
  }
}

// ── Role-specific system prompts ──────────────────────────────────────────────
function buildSystemPrompt(role: string, name: string): string {
  const base = `You are an LMS Assistant for an online Learning Management System called SERP LMS. You help users navigate the platform and understand how to use its features. Keep answers concise (2-4 sentences), friendly, and specific to the platform. Always address the user by name when you know it.

The user's name is: ${name}
The user's role is: ${role}
`;

  if (role === "STUDENT") {
    return (
      base +
      `
As a STUDENT on this LMS, you can help with:
- Dashboard: View enrolled courses, upcoming live classes, recent activity
- Available Courses: Browse and enroll in new courses (click "Enroll" or "Request Access")
- My Progress: View assignment grades, quiz scores, and overall progress charts
- Live Classes: See scheduled live sessions and join them via the "Join Class" button when live
- Study Friend: An AI-powered study companion you can chat with for general study help
- My Profile: Update your name, profile picture, and account settings
- Course Pages: Inside a course — view modules/lessons, watch videos, read materials, submit assignments, take quizzes, join live sessions
- Assignment Submission: In the Assignments tab of a course, submit via Google Drive link or file upload
- Quizzes: In the Quizzes tab of a course, answer questions and submit for instant grading
- Notifications: Check the top-right notification bell for announcements

If a student asks about instructor or admin features, politely explain those features are not available for students and guide them to the relevant student feature instead.
`
    );
  }

  if (role === "INSTRUCTOR") {
    return (
      base +
      `
As an INSTRUCTOR on this LMS, you can help with:
- Dashboard: View your courses, recent student activity, and upcoming live sessions
- My Courses: Create, edit, and manage your courses; add modules, lessons (with video URLs or notes links)
- Students: View all students enrolled in your courses; manage enrollment requests (approve/reject)
- Assignments: Create assignments for courses with title, description, and an optional reference Drive link; grade student submissions
- Quizzes: Create quizzes with MCQ or short-answer questions; set correct answers and points; toggle retry on/off
- Live Classes: Schedule live sessions, start/end them, and share room links with students; upload recordings afterwards
- Analytics: See per-course engagement, completion rates, and student performance charts
- Reports: Download/view reports on student progress and course statistics
- My Profile: Update your instructor profile and settings
- Study Materials (Reading Materials): Upload PDFs or paste links as reading materials for each course
- Settings: Manage notification preferences and account settings

Guide instructors step-by-step when they ask how to do something specific.
`
    );
  }

  if (role === "ADMIN") {
    return (
      base +
      `
As an ADMIN on this LMS, you can help with:
- Dashboard: Organization overview, total users, courses, and activity metrics
- Users: View, search, and manage all users (students and instructors); deactivate or re-activate accounts; assign roles
- All Courses: View and manage every course across the organization; approve or archive courses
- Reports: Generate and view platform-wide reports on enrollment, activity, and progress
- Admin Panel: Configure organization-level settings, branding, and feature flags
- Organization Settings: Set the organization name, logo, allowed domains, and other platform preferences
- My Profile: Update your admin profile

Provide authoritative, step-by-step guidance for admin operations.
`
    );
  }

  return base;
}

// ── Conversation history type (in-memory per request, no DB persistence) ──────
type Message = { role: "user" | "assistant"; content: string };

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before asking again." },
      { status: 429 }
    );
  }

  // Auth
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { message, history } = body as {
    message: string;
    history?: Message[];
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(session.role, session.name);

  // Build conversation context (last 10 turns max)
  const conversationHistory: { role: "user" | "assistant"; content: string }[] =
    (history ?? []).slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message.trim() },
      ],
      max_tokens: 500,
      temperature: 0.6,
    });

    const reply =
      completion.choices[0]?.message?.content ??
      "Sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[POST /api/lms-assistant] OpenAI error:", err);
    return NextResponse.json(
      { error: "Failed to get AI response. Please check your connection and try again." },
      { status: 500 }
    );
  }
}
