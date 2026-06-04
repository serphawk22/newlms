import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, BookPlus, UserPlus, BarChart3, BookOpen, GraduationCap, Zap } from "lucide-react";
import Link from "next/link";

interface ActivityEntry {
  id: string;
  message: string;
  type: string;
  createdAt: Date;
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminActivityFeed({ activities }: { activities: ActivityEntry[] }) {
  return (
    <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--foreground)" }}>
          <Activity className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-72 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--muted-foreground)" }}>No recent activity</p>
        ) : activities.map((a) => {
          return (
            <div
              key={a.id}
              className="flex items-start gap-3 p-2.5 rounded-lg transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div
                className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
              >
                <Activity className="w-3 h-3" style={{ color: "var(--foreground)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug" style={{ color: "var(--foreground)" }}>{a.message}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{timeAgo(a.createdAt)}</p>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)", border: "1px solid var(--border)" }}
              >
                {a.type}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function AdminQuickActions({ orgId }: { orgId: string }) {
  return (
    <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold" style={{ color: "var(--foreground)" }}>
          <Zap className="w-4 h-4" style={{ color: "#D9252A" }} /> Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Link href="/instructor#directory">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(217,37,42,0.06)"; e.currentTarget.style.borderColor = "rgba(217,37,42,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <UserPlus className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> Add Instructor
          </Button>
        </Link>
        <Link href="/instructor#courses">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(217,37,42,0.06)"; e.currentTarget.style.borderColor = "rgba(217,37,42,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <BookPlus className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> Create Course
          </Button>
        </Link>
        <Link href="/instructor#admin-analytics">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(217,37,42,0.06)"; e.currentTarget.style.borderColor = "rgba(217,37,42,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> View Reports
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
