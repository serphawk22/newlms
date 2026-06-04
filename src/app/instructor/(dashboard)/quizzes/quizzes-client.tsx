"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search } from "lucide-react";
import Link from "next/link";
import type { QuizRow } from "./page";

interface Props {
  quizzes: QuizRow[];
}

export function QuizzesPageClient({ quizzes }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return quizzes;
    const q = search.toLowerCase();
    return quizzes.filter((qz) => qz.title.toLowerCase().includes(q) || qz.courseTitle.toLowerCase().includes(q));
  }, [quizzes, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page space-y-6"
    >
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Quizzes</h1>
        <span
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          {quizzes.length} quizzes
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
        <Input
          placeholder="Search quizzes..."
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
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                {["Title", "Course", "Questions", "Submissions"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/instructor/courses/${q.courseId}`}
                      className="text-sm font-semibold transition-colors"
                      style={{ color: "var(--foreground)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#D9252A")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--foreground)")}
                    >
                      {q.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{q.courseTitle}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{q.questions}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{q.submissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <HelpCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border)" }} />
            No quizzes found.
          </div>
        )}
      </Card>
    </motion.div>
  );
}
