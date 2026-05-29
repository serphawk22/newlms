"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

export interface TimelineItem {
  id: string;
  type: "logins" | "enrollments" | "completions" | "quiz_attempts";
  text: string;
  createdAt: string;
}

interface TimelineFeedProps {
  items: TimelineItem[];
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TimelineFeed({ items }: TimelineFeedProps) {
  const [filter, setFilter] = useState<"all" | TimelineItem["type"]>("all");
  const [limit, setLimit] = useState(20);

  const filtered = useMemo(() => {
    const list = filter === "all" ? items : items.filter((item) => item.type === filter);
    return list.slice(0, limit);
  }, [items, filter, limit]);

  const dotClass = (type: TimelineItem["type"]) => {
    if (type === "completions") return "bg-green-600";
    if (type === "logins") return "bg-blue-600";
    if (type === "enrollments") return "bg-amber-500";
    return "bg-purple-600";
  };

  let lastDate = "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All", value: "all" },
          { label: "Logins", value: "logins" },
          { label: "Enrollments", value: "enrollments" },
          { label: "Completions", value: "completions" },
          { label: "Quiz attempts", value: "quiz_attempts" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setFilter(option.value as "all" | TimelineItem["type"]);
              setLimit(20);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === option.value ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Card className="border-zinc-200 p-4">
        <div className="space-y-3">
          {filtered.map((item) => {
            const created = new Date(item.createdAt);
            const day = created.toLocaleDateString();
            const showDate = day !== lastDate;
            lastDate = day;
            return (
              <div key={item.id}>
                {showDate && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 pt-2 pb-1">{day}</p>
                )}
                <div className="flex items-start gap-3 py-2">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${dotClass(item.type)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-900">{item.text}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{timeAgo(created)}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-zinc-400 py-8 text-center">No timeline events.</p>}
        </div>
      </Card>

      {limit < (filter === "all" ? items.length : items.filter((item) => item.type === filter).length) && (
        <div className="flex justify-center">
          <button
            onClick={() => setLimit((value) => value + 20)}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
