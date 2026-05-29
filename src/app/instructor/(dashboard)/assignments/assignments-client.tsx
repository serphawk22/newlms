"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import type { AssignmentRow } from "./page";

interface Props {
  assignments: AssignmentRow[];
}

export function AssignmentsPageClient({ assignments }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return assignments;
    const q = search.toLowerCase();
    return assignments.filter((a) => a.title.toLowerCase().includes(q) || a.courseTitle.toLowerCase().includes(q));
  }, [assignments, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page space-y-6"
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Assignments</h1>
        <span className="ml-auto text-xs font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
          {assignments.length} assignments
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="Search assignments..."
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
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Created</th>
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/instructor/courses/${a.courseId}`} className="text-sm font-medium text-zinc-900 hover:text-violet-700 transition-colors">
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{a.courseTitle}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{a.submissions}/{a.totalStudents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">No assignments found.</div>
        )}
      </Card>
    </motion.div>
  );
}
