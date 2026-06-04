import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Video, BookOpen, PhoneOff } from "lucide-react";
import type { Metadata } from "next";
// LiveClassRoomClient is a "use client" wrapper that does dynamic(ssr:false)
// internally — ssr:false is only legal inside Client Components.
import LiveClassRoomClient from "@/components/LiveClassRoomClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    other: {
      "Permissions-Policy": "camera=*, microphone=*, display-capture=*, fullscreen=*",
    },
  };
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

interface PageProps {
  params: Promise<{ roomId: string }>;
}

// ── Server action: host ends the session ─────────────────────────────────────
async function endSession(formData: FormData) {
  "use server";
  const sessionId = formData.get("sessionId") as string;
  const courseId  = formData.get("courseId")  as string;
  await prisma.liveSession.update({
    where: { id: sessionId },
    data:  { status: "COMPLETED" },
  });
  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}?tab=live`);
}

export default async function MeetPage({ params }: PageProps) {
  const { roomId } = await params;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: { userId: string; email: string; role: string; organizationId: string };
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as typeof payload;
  } catch {
    redirect("/login");
  }

  // ── Fetch session + user in parallel ────────────────────────────────────
  const [session, user] = await Promise.all([
    prisma.liveSession.findUnique({
      where: { roomId },
      select: {
        id: true,
        roomId: true,
        title: true,
        status: true,
        moduleId: true,
        course: {
          select: {
            id: true,
            title: true,
            organizationId: true,
            creator: { select: { name: true } },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true },
    }),
  ]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <div className="text-center space-y-6 p-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <Video className="w-10 h-10" style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Room Not Found</h1>
            <p style={{ color: "var(--muted-foreground)" }}>This live session doesn&apos;t exist or has ended.</p>
          </div>
          <Link
            href="/student"
            className="inline-flex items-center gap-2 transition-colors text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isHost = payload.role === "INSTRUCTOR" || payload.role === "ADMIN";
  const displayName = user?.name || payload.email.split("@")[0];
  const instructorName = session.course.creator?.name || "Instructor";

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0 gap-4"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >

        {/* Left: back / leave */}
        {isHost ? (
          /* Instructor: "End Class" ends the session in DB */
          <form action={endSession} className="shrink-0">
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="courseId"  value={session.course.id} />
            <button
              type="submit"
              className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors border"
              style={{
                background: "rgba(217,37,42,0.12)",
                borderColor: "rgba(217,37,42,0.25)",
                color: "var(--foreground)",
              }}
            >
              <PhoneOff className="w-4 h-4" />
              End Class
            </button>
          </form>
        ) : (
          /* Student: just navigates away */
          <Link
            href="/student"
            className="flex items-center gap-2 transition-colors text-sm shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Leave Class
          </Link>
        )}

        {/* Centre: session info */}
        <div className="flex items-center gap-3 min-w-0" style={{ color: "var(--foreground)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: "var(--accent)" }} />
            <span className="text-sm font-semibold truncate">{session.title}</span>
          </div>
          <span className="hidden sm:block" style={{ color: "var(--border)" }}>|</span>
          <div className="hidden sm:flex items-center gap-1 text-xs min-w-0" style={{ color: "var(--muted-foreground)" }}>
            <BookOpen className="w-3 h-3 shrink-0" />
            <span className="truncate">{session.course.title}</span>
          </div>
        </div>

        {/* Right: role badge */}
        <div className="text-xs shrink-0">
          {isHost ? (
            <span
              className="font-semibold px-2 py-1 rounded-full border"
              style={{
                background: "rgba(217,37,42,0.10)",
                borderColor: "rgba(217,37,42,0.25)",
                color: "var(--foreground)",
              }}
            >
              ● Host
            </span>
          ) : (
            <span
              className="font-semibold px-2 py-1 rounded-full border"
              style={{
                background: "rgba(33,37,41,0.04)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              ● Student
            </span>
          )}
        </div>
      </div>

      {/* ── ZEGOCLOUD room ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <LiveClassRoomClient
          roomId={roomId}
          userId={payload.userId}
          userName={displayName}
          isHost={isHost}
          instructorName={instructorName}
          courseId={session.course.id}
          sessionTitle={session.title}
          moduleId={session.moduleId ?? undefined}
        />
      </div>
    </div>
  );
}
