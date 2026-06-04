import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Radio, Calendar, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function StudentLiveClassesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload;
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    include: { enrollments: true },
  });

  if (!user) redirect("/login");

  const enrolledCourseIds = user.enrollments.map((e) => e.courseId);

  const liveSessions = enrolledCourseIds.length > 0
    ? await prisma.liveSession.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          status: { in: ["SCHEDULED", "ONGOING"] },
        },
        include: { course: { select: { title: true, id: true } } },
        orderBy: { scheduledAt: "asc" },
      })
    : [];

  const ongoingSession = liveSessions.find((s) => s.status === "ONGOING");
  const scheduledSessions = liveSessions.filter((s) => s.status === "SCHEDULED");

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  return (
    <div className="container-page space-y-8">
      <div className="flex items-center gap-2">
        <Video className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Live Classes</h1>
      </div>

      {/* Ongoing session banner */}
      {ongoingSession && (
        <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: "rgba(217,37,42,0.06)", border: "1px solid rgba(217,37,42,0.15)" }}>
          <div className="flex items-center gap-3">
            <span className="live-dot" />
            <div>
              <p className="font-bold text-sm" style={{ color: "#D9252A" }}>Live Now: {ongoingSession.title}</p>
              <p className="text-xs" style={{ color: "#D9252A" }}>{ongoingSession.course.title}</p>
            </div>
          </div>
          <Link href={`/meet/${ongoingSession.roomId}`}>
            <Button className="bg-red-600 hover:bg-red-700 text-white text-sm">
              <Radio className="w-4 h-4 mr-2" /> Join Now
            </Button>
          </Link>
        </div>
      )}

      {/* Scheduled sessions */}
      {scheduledSessions.length > 0 ? (
        <section className="space-y-3">
          <div className="section-divider"><span>Upcoming Classes</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scheduledSessions.map((session) => (
              <Card key={session.id} className="transition-all" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{session.title}</CardTitle>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{session.course.title}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    <Calendar className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                    {formatDate(session.scheduledAt)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="status-badge status-badge--info">Scheduled</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : !ongoingSession && (
        <div className="empty-state">
          <Video />
          <p>No upcoming live classes scheduled for your enrolled courses.</p>
        </div>
      )}
    </div>
  );
}
