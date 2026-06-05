"use client";

import { useState, useCallback } from "react";
import { Eye, X, CheckCircle2, XCircle, BarChart2, RefreshCw } from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";
import { Button } from "@/components/ui/button";

interface StudentAnalytic {
  studentId: string;
  name: string;
  email: string;
  viewed: boolean;
  viewedAt: string | null;
  viewCount: number;
}

interface Props {
  materialId: string;
  materialTitle: string;
  courseId: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function MaterialAnalyticsButton({ materialId, materialTitle, courseId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<StudentAnalytic[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/material-views?materialId=${materialId}&courseId=${courseId}&t=${Date.now()}`
      );
      const data = await res.json();
      setAnalytics(data.analytics ?? []);
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [materialId, courseId]);

  const handleOpen = async () => {
    setOpen(true);
    // Always re-fetch fresh data on open (never use stale cache)
    await fetchAnalytics();
  };

  const handleClose = () => {
    setOpen(false);
    // Clear so next open always fetches fresh data
    setAnalytics(null);
  };

  const viewedCount = analytics?.filter((a) => a.viewed).length ?? 0;
  const total = analytics?.length ?? 0;

  return (
    <>
      {/* Eye icon trigger */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        title="View analytics"
        id={`analytics-btn-${materialId}`}
        style={{ color: "var(--muted-foreground)" }}
      >
        <Eye className="w-4 h-4" />
      </Button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          role="dialog"
          aria-modal="true"
        >
          <div className="rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 10px 22px rgba(17,24,39,0.10)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <BarChart2 className="w-5 h-5 shrink-0" style={{ color: "#D9252A" }} />
                <div className="min-w-0">
                  <h2 className="font-bold truncate" style={{ color: "var(--foreground)" }}>View Analytics</h2>
                  <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{materialTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {analytics && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(217,37,42,0.08)", color: "#D9252A" }}>
                    {viewedCount} / {total} viewed
                  </span>
                )}
                <button
                  onClick={fetchAnalytics}
                  disabled={loading}
                  title="Refresh analytics"
                  aria-label="Refresh analytics"
                  className="p-1 disabled:opacity-50 transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={handleClose}
                  aria-label="Close analytics"
                  className="p-1 transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center justify-center py-16 gap-3" style={{ color: "var(--muted-foreground)" }}>
                  <RingLoader size="sm" />
                  <span>Loading analytics…</span>
                </div>
              )}

              {!loading && error && (
                <div className="text-center py-12 text-sm px-6" style={{ color: "#D9252A" }}>{error}</div>
              )}

              {!loading && !error && analytics?.length === 0 && (
                <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  No students enrolled in this course yet.
                </div>
              )}

              {!loading && !error && analytics && analytics.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
                    <thead className="sticky top-0 z-10" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
                      <tr>
                        <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>#</th>
                        <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Student</th>
                        <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Email</th>
                        <th className="text-center px-6 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Status</th>
                        <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Last Opened</th>
                        <th className="text-center px-6 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Opens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((row, idx) => (
                        <tr
                          key={row.studentId}
                          className={`transition-colors ${row.viewed ? "" : "opacity-60"}`}
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <td className="px-6 py-3 font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{idx + 1}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={row.viewed ? { background: "rgba(217,37,42,0.08)", color: "#D9252A" } : { background: "var(--muted)", color: "var(--muted-foreground)" }}>
                                {row.name[0]?.toUpperCase() ?? "?"}
                              </div>
                              <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{row.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>{row.email}</td>
                          <td className="px-6 py-3 text-center">
                            {row.viewed ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(217,37,42,0.08)", color: "#D9252A" }}>
                                <CheckCircle2 className="w-3 h-3" /> Viewed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                                <XCircle className="w-3 h-3" /> Not Viewed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {row.viewedAt ? formatDateTime(row.viewedAt) : "—"}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="text-xs font-bold" style={{ color: row.viewCount > 0 ? "#D9252A" : "var(--muted-foreground)" }}>
                              {row.viewCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
