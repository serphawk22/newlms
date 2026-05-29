"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface EnrollmentTrend { label: string; value: number }
interface QuizPerformance { course: string; score: number }
interface EngagementPoint { day: string; active: number }
interface FunnelPoint { stage: string; value: number }

interface AnalyticsChartsProps {
  enrollmentTrends: EnrollmentTrend[];
  quizPerformance: QuizPerformance[];
  engagement: EngagementPoint[];
  funnel: FunnelPoint[];
}

export function AnalyticsCharts({ enrollmentTrends, quizPerformance, engagement, funnel }: AnalyticsChartsProps) {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const trendData = useMemo(() => {
    if (period === "week") return enrollmentTrends.slice(-7);
    if (period === "year") return enrollmentTrends;
    return enrollmentTrends.slice(-30);
  }, [period, enrollmentTrends]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Enrollment Trends</h3>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area dataKey="value" type="monotone" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} isAnimationActive animationDuration={700} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Quiz Performance</h3>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quizPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="course" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#16a34a" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Student Engagement</h3>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={engagement}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line dataKey="active" type="monotone" stroke="#8b5cf6" strokeWidth={2} isAnimationActive animationDuration={700} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Completion Funnel</h3>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnel} isAnimationActive animationDuration={700} />
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function PeriodToggle({ value, onChange }: { value: "week" | "month" | "year"; onChange: (next: "week" | "month" | "year") => void }) {
  return (
    <div className="flex gap-1">
      {(["week", "month", "year"] as const).map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`px-2 py-0.5 text-[10px] rounded-md ${value === item ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
