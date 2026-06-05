"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, ClipboardList, Layers, Video, LogIn, CheckCheck, MessageSquare, HelpCircle } from "lucide-react";

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
  COURSE:           { icon: <BookOpen className="w-3.5 h-3.5 text-blue-600" />,   bg: "bg-blue-50",   dot: "bg-blue-500",   label: "Course" },
  ASSIGNMENT:       { icon: <ClipboardList className="w-3.5 h-3.5 text-amber-600" />, bg: "bg-amber-50", dot: "bg-amber-500", label: "Assignment" },
  MODULE:           { icon: <Layers className="w-3.5 h-3.5 text-purple-600" />,   bg: "bg-purple-50", dot: "bg-purple-500", label: "Module" },
  LIVE:             { icon: <Video className="w-3.5 h-3.5 text-red-600" />,       bg: "bg-red-50",    dot: "bg-red-500",    label: "Live" },
  LIVE_CLASS:       { icon: <Video className="w-3.5 h-3.5 text-red-600" />,       bg: "bg-red-50",    dot: "bg-red-500",    label: "Live" },
  LOGIN:            { icon: <LogIn className="w-3.5 h-3.5 text-zinc-500" />,      bg: "bg-zinc-50",   dot: "bg-zinc-400",   label: "Login" },
  ADMIN_COMMENT:    { icon: <MessageSquare className="w-3.5 h-3.5 text-orange-600" />, bg: "bg-orange-50", dot: "bg-orange-500", label: "Admin Feedback" },
  STUDENT_QUESTION: { icon: <HelpCircle className="w-3.5 h-3.5 text-sky-600" />, bg: "bg-sky-50", dot: "bg-sky-500", label: "Student Q&A" },
};

const DEFAULT_META = { icon: <Bell className="w-3.5 h-3.5 text-zinc-500" />, bg: "bg-zinc-50", dot: "bg-zinc-400", label: "Notice" };

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
        className="relative p-2 rounded-full text-zinc-300 lg:text-zinc-600 hover:bg-white/10 lg:hover:bg-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-zinc-500" />
              <h3 className="font-bold text-zinc-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-50">
            {loading && notifications.length === 0 && (
              <div className="p-6 text-center text-sm text-zinc-400">Loading...</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 text-zinc-300" />
                </div>
                <p className="text-sm font-semibold text-zinc-500">All caught up!</p>
                <p className="text-xs text-zinc-400 mt-0.5">No new notifications.</p>
              </div>
            )}
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? DEFAULT_META;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left flex gap-3 px-4 py-3 transition-colors group ${
                    n.isRead
                      ? "bg-white hover:bg-zinc-50"
                      : "bg-blue-50/60 hover:bg-blue-50"
                  }`}
                >
                  {/* Type icon */}
                  <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm text-zinc-800 leading-snug line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.bg} text-zinc-600`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-zinc-400">{timeAgo(n.createdAt)}</span>
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
            <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50">
              <p className="text-[11px] text-zinc-400 text-center">
                Click a notification to go to the related page
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
