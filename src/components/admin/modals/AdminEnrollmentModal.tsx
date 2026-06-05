"use client";
import { useEffect, useState } from "react";
import { X, TrendingUp } from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";
import { Button } from "@/components/ui/button";

interface Enrollment {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseId: string;
  progress: number;
}

interface Props {
  orgId: string;
  onClose: () => void;
}

export function AdminEnrollmentModal({ orgId, onClose }: Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");

  useEffect(() => {
    fetch(`/api/admin/enrollments?orgId=${orgId}`)
      .then((r) => r.json())
      .then((d) => { setEnrollments(d.enrollments ?? []); setLoading(false); });
  }, [orgId]);

  const filtered = enrollments.filter(
    (e) =>
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      e.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
      e.studentEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-500" />
            <h2 className="text-base font-bold text-slate-900">Enrollment Details</h2>
            {!loading && (
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold ml-1">
                {enrollments.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <input
            type="text"
            placeholder="Search by student or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[rgba(217,37,42,0.25)] focus:border-[#D9252A]"
          />
        </div>

        {/* Body */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RingLoader size="md" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-16">No enrollments found.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
              <thead className="sticky top-0 z-10" style={{ background: "var(--secondary-background)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Student</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Course</th>
                  <th className="text-center py-3 px-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="py-3 px-5">
                      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{e.studentName}</p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{e.studentEmail}</p>
                    </td>
                    <td className="py-3 px-4 text-sm" style={{ color: "var(--muted-foreground)" }}>{e.courseTitle}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {Math.round(e.progress)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-slate-600">Close</Button>
        </div>
      </div>
    </div>
  );
}
