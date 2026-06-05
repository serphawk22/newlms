"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CalendarDays, BookOpen, ClipboardList, Layers, CheckCheck } from "lucide-react";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: string;
  course?: { title: string } | null;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ASSIGNMENT_DEADLINE: {
    label: "Assignment",
    color: "border-[var(--accent)]",
    icon: <ClipboardList className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />,
  },
  MODULE_PUBLISH: {
    label: "New Module",
    color: "border-[var(--accent)]",
    icon: <Layers className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />,
  },
  COURSE_PUBLISHED: {
    label: "Course",
    color: "border-[var(--accent)]",
    icon: <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />,
  },
};

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Group events by date string (YYYY-MM-DD)
function groupByDate(events: CalendarEvent[]) {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    const key = new Date(e.date).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

export function CalendarDropdown() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false); // tracks if user clicked "mark all read"
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/events", { cache: "no-store" });
      if (res.status === 401) return; // Not a student — silently ignore
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch {
      // Swallow silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchEvents();
  }, [mounted, fetchEvents]);

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

  const grouped = groupByDate(events);
  const dateKeys = Object.keys(grouped);

  // Count events in the next 7 days as a badge
  const upcomingSoon = events.filter((e) => {
    // eslint-disable-next-line
    const diff = new Date(e.date).getTime() - Date.now();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Visible badge count — zeroed when user clicks "Mark all read"
  const visibleBadge = dismissed ? 0 : upcomingSoon;

  function handleDismiss() {
    setDismissed(true);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Calendar icon button */}
      <button
        id="calendar-btn"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchEvents();
        }}
        className="relative p-2 rounded-full transition-colors focus:outline-none"
        aria-label="Calendar"
        style={{ color: "var(--muted-foreground)" }}
      >
        <CalendarDays className="w-5 h-5" />
        {visibleBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none" style={{ background: "#D9252A" }}>
            {visibleBadge}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--foreground)" }}>
              <CalendarDays className="w-4 h-4" style={{ color: "var(--accent)" }} />
              Upcoming Events
            </h3>
            {visibleBadge > 0 && (
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: "var(--foreground)" }}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Loading...</div>
            )}
            {!loading && dateKeys.length === 0 && (
              <div className="p-8 text-center">
                <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No upcoming events</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Check back later!</p>
              </div>
            )}
            {dateKeys.map((dateKey) => (
              <div key={dateKey} className="px-4 py-3">
                {/* Date group header */}
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>
                  {formatDateHeader(grouped[dateKey][0].date)}
                </p>
                <div className="space-y-2">
                  {grouped[dateKey].map((event) => {
                    const cfg = TYPE_CONFIG[event.type] ?? {
                      label: event.type,
                      color: "border-[var(--muted-foreground)]",
                      icon: <CalendarDays className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />,
                    };
                    return (
                      <div
                        key={event.id}
                        className={`flex items-start gap-2.5 border-l-4 rounded-r-lg px-3 py-2 ${cfg.color}`}
                        style={{ background: "var(--secondary-background)" }}
                      >
                        <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug truncate" style={{ color: "var(--foreground)" }}>
                            {event.title}
                          </p>
                          {event.course && (
                            <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                              {event.course.title}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                              {formatTime(event.date)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
