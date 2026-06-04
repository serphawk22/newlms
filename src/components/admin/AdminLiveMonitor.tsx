import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Clock, Radio, CheckCircle } from "lucide-react";

interface LiveSessionEntry {
  id: string;
  title: string;
  status: string;
  scheduledAt: Date;
  course: { title: string; creator: { name: string | null } | null };
}

interface RecordedEntry {
  id: string;
  title: string;
  createdAt: Date;
  course: { title: string };
  instructor: { name: string | null };
}

interface LiveClassData {
  upcoming: LiveSessionEntry[];
  ongoing: LiveSessionEntry[];
  recorded: RecordedEntry[];
}

function SessionCard({ session, badge }: { session: LiveSessionEntry; badge: React.ReactNode }) {
  return (
    <div
      className="flex items-start justify-between p-3 rounded-lg transition-colors"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{session.title}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>{session.course.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>By {session.course.creator?.name || "Unknown"}</p>
      </div>
      <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
        {badge}
        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          {new Date(session.scheduledAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export function AdminLiveMonitor({ data }: { data: LiveClassData }) {
  return (
    <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--foreground)" }}>
          <Video className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> Live Class Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Upcoming */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Upcoming ({data.upcoming.length})
            </span>
          </div>
          <div className="space-y-2">
            {data.upcoming.length === 0 ? (
              <p className="text-xs px-1" style={{ color: "var(--muted-foreground)" }}>No upcoming sessions</p>
            ) : data.upcoming.slice(0, 5).map((s) => (
              <SessionCard key={s.id} session={s} badge={
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                >UPCOMING</span>
              } />
            ))}
          </div>
        </div>
        {/* Ongoing */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Ongoing ({data.ongoing.length})
            </span>
          </div>
          <div className="space-y-2">
            {data.ongoing.length === 0 ? (
              <p className="text-xs px-1" style={{ color: "var(--muted-foreground)" }}>No ongoing sessions</p>
            ) : data.ongoing.slice(0, 5).map((s) => (
              <SessionCard key={s.id} session={s} badge={
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                  style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A" }}
                >LIVE</span>
              } />
            ))}
          </div>
        </div>
        {/* Recorded */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Recorded ({data.recorded.length})
            </span>
          </div>
          <div className="space-y-2">
            {data.recorded.length === 0 ? (
              <p className="text-xs px-1" style={{ color: "var(--muted-foreground)" }}>No recordings yet</p>
            ) : data.recorded.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between p-3 rounded-lg transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{r.title}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>{r.course.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>By {r.instructor.name || "Unknown"}</p>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                >RECORDED</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
