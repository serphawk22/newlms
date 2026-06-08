"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, ClipboardList, Layers, Video, LogIn, CheckCheck, MessageSquare, HelpCircle, FileText, Award, GraduationCap } from "lucide-react";

type Notification = {
  id: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

// ── Map notification type → fallback destination route ──────────────────
function getFallbackLink(type: string): string {
  switch (type) {
    case "ADMIN_COMMENT":
    case "STUDENT_QUESTION":
    default:
      return "/instructor";
  }
}

// ── Map notification type → icon + color ──────────────────────────────────
const TYPE_META: Record<string, { icon: React.ReactNode; bg: string; dot: string; label: string }> = {
  COURSE:           { icon: <BookOpen className="w-3.5 h-3.5 text-[#D9252A]" />,   bg: "bg-[rgba(217,37,42,0.08)]",   dot: "bg-[#D9252A]",   label: "Course" },
  ASSIGNMENT:       { icon: <ClipboardList className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />, bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Assignment" },
  MODULE:           { icon: <Layers className="w-3.5 h-3.5 text-[#D9252A]" />,   bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Module" },
  LIVE:       { icon: <Video className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />,       bg: "bg-[rgba(217,37,42,0.08)]",    dot: "bg-[#D9252A]",    label: "Live" },
  LIVE_CLASS:       { icon: <Video className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />,       bg: "bg-[rgba(217,37,42,0.08)]",    dot: "bg-[#D9252A]",    label: "Live" },
  LOGIN:      { icon: <LogIn className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />,      bg: "bg-[var(--muted)]",   dot: "bg-[var(--muted-foreground)]",   label: "Login" },
  ADMIN_COMMENT:    { icon: <MessageSquare className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />, bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Admin Feedback" },
  STUDENT_QUESTION: { icon: <HelpCircle className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />, bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Student Q&A" },
  QUIZ:             { icon: <HelpCircle className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />,   bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Quiz" },
  QUIZ_RESULT:      { icon: <CheckCheck className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />,   bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Quiz Result" },
  SUBMISSION:       { icon: <FileText className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />,    bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Submission" },
  MATERIAL:         { icon: <BookOpen className="w-3.5 h-3.5 text-[#D9252A]" />,   bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Material" },
  ENROLLMENT:       { icon: <GraduationCap className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />, bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Enrollment" },
  CERTIFICATE:      { icon: <Award className="w-3.5 h-3.5" style={{ color: "#D9252A" }} />,       bg: "bg-[rgba(217,37,42,0.08)]", dot: "bg-[#D9252A]", label: "Certificate" },
};

const DEFAULT_META = { icon: <Bell className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />, bg: "bg-[var(--muted)]", dot: "bg-[var(--muted-foreground)]", label: "Notice" };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function InstructorNotificationsDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => { setMounted(true); }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/instructor/notifications", { cache: "no-store" });
      if (res.status === 401) return;
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchNotifications();

    // SSE subscription for real-time updates
    const eventSource = new EventSource("/api/instructor/notifications", {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setLoading(false);
      } catch {
        // silent
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      intervalRef.current = setInterval(fetchNotifications, 60000);
    };

    return () => {
      eventSource.close();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mounted, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/instructor/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/instructor/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.isRead) await markRead(n.id);
    const destination = n.link ?? getFallbackLink(n.type);
    setOpen(false);
    router.push(destination);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="instructor-notifications-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9252A]" style={{ color: "#D9252A" }}
        aria-label="Notifications"
        suppressHydrationWarning
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none" style={{ background: "#D9252A" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <h3 className="font-bold text-sm" style={{ color: "var(--foreground)" }}>Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A" }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[#D9252A] hover:text-[#C21F24] font-semibold transition-colors"
                suppressHydrationWarning
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto" style={{ borderColor: "var(--border)" }}>
            {loading && notifications.length === 0 && (
              <div className="p-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Loading...</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "var(--muted)" }}>
                  <Bell className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>All caught up!</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>No new notifications.</p>
              </div>
            )}
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? DEFAULT_META;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  suppressHydrationWarning
                  className={`w-full text-left flex gap-3 px-4 py-3 transition-colors group`}
                  style={n.isRead ? { background: "var(--card)" } : { background: "rgba(217,37,42,0.04)" }}
                >
                  {/* Type icon */}
                  <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm leading-snug line-clamp-2" style={{ color: "var(--foreground)" }}>{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.bg}`} style={{ color: "var(--muted-foreground)" }}>
                        {meta.label}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <div className={`w-2 h-2 rounded-full ${meta.dot} shrink-0 mt-1.5`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--border)", background: "var(--secondary-background)" }}>
              {/* Footer */}
              <p className="text-[11px] text-center" style={{ color: "var(--muted-foreground)" }}>
                Click a notification to go to the related page
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
