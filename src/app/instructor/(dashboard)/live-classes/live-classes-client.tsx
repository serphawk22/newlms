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

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  ONGOING: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-zinc-100 text-zinc-500",
};

export function LiveClassesPageClient({ sessions }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q) || s.courseTitle.toLowerCase().includes(q));
  }, [sessions, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page space-y-6"
    >
      <div className="flex items-center gap-2">
        <Video className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Live Classes</h1>
        <span className="ml-auto text-xs font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
          {sessions.length} sessions
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="Search live classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-zinc-200"
        />
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Title</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Course</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Scheduled</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">{s.title}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{s.courseTitle}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {new Date(s.scheduledAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${statusStyles[s.status] || "bg-zinc-100 text-zinc-600"}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">No live classes found.</div>
        )}
      </Card>
    </motion.div>
  );
}
