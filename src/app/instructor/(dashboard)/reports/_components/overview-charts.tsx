"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import Link from "next/link";
import { PieChart as PieChartIcon } from "lucide-react";

interface ActivityChartProps {
  data: { date: string; logins: number; completions: number }[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const [range, setRange] = useState<"week" | "month" | "year">("month");

  const filtered = range === "week" ? data.slice(-7) : range === "year" ? data : data;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-900">Activity</h3>
        <div className="flex gap-1">
          {(["week", "month", "year"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                range === r ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
            />
            <Line type="monotone" dataKey="logins" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="completions" stroke="#16a34a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface DonutChartProps {
  completed: number;
  inProgress: number;
  notStarted: number;
  totalCourses: number;
}

export function CompletionDonut({ completed, inProgress, notStarted, totalCourses }: DonutChartProps) {
  const pieData = [
    { name: "Completed", value: completed, color: "#16a34a" },
    { name: "In Progress", value: inProgress, color: "#2563eb" },
    { name: "Not Started", value: notStarted, color: "#71717a" },
  ].filter((d) => d.value > 0);

  if (totalCourses === 0) {
    return (
      <div className="empty-state">
        <PieChartIcon className="w-10 h-10 text-zinc-300" />
        <p className="text-sm text-zinc-500 mt-2">No stats to show</p>
        <Link
          href="/instructor/courses"
          className="text-sm font-medium text-zinc-900 hover:underline mt-1 inline-block"
        >
          Create your first course
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="w-28 h-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={42}
              paddingAngle={2}
              dataKey="value"
              animationBegin={200}
              animationDuration={800}
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5">
        {pieData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-zinc-500">{entry.name}</span>
            <span className="font-semibold text-zinc-900 ml-auto">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
