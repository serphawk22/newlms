"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Video, Search } from "lucide-react";
import type { LiveClassRow } from "./page";

interface Props {
  sessions: LiveClassRow[];
}

export function LiveClassesPageClient({ sessions }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q) || s.courseTitle.toLowerCase().includes(q));
  }, [sessions, search]);

  const getStatusStyle = (status: string) => {
    if (status === "ONGOING") {
      return {
        background: "rgba(217,37,42,0.12)",
        color: "#D9252A",
        borderColor: "rgba(217,37,42,0.25)",
      };
    }
    if (status === "SCHEDULED") {
      return {
        background: "rgba(255,255,255,0.06)",
        color: "var(--foreground)",
        borderColor: "var(--border)",
      };
    }
    return {
      background: "rgba(255,255,255,0.04)",
      color: "var(--muted-foreground)",
      borderColor: "var(--border)",
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page space-y-6"
    >
      <div className="flex items-center gap-2">
        <Video className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Live Classes</h1>
        <span
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          {sessions.length} sessions
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
        <Input
          placeholder="Search live classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "var(--secondary-background)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
          className="pl-9 focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
        />
      </div>

      <Card
        className="overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                {["Title", "Course", "Scheduled", "Status"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{s.title}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{s.courseTitle}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>
                    {new Date(s.scheduledAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border"
                      style={getStatusStyle(s.status)}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <Video className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border)" }} />
            No live classes found.
          </div>
        )}
      </Card>
    </motion.div>
  );
}
