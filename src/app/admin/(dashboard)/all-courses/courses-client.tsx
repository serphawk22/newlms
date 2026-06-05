"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertCircle } from "lucide-react";
import { Loader } from "@/components/ui/loader";

interface CourseRow {
  id: string;
  title: string;
  creator: { name: string | null } | null;
  _count: { enrollments: number };
  published: boolean;
}

interface Props {
  courses: CourseRow[];
  defaultPublished?: boolean;
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-xl w-full max-w-sm mx-4" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A" }}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{title}</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{message}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "var(--secondary-background)", color: "var(--muted-foreground)" }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: "#D9252A" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
            >
              {loading && <Loader size="sm" variant="bars" />}
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoursesClient({ courses, defaultPublished }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishedFilter, setPublishedFilter] = useState<"all" | "published" | "draft">(
    defaultPublished === true ? "published" : "all"
  );

  const visibleCourses = publishedFilter === "published"
    ? courses.filter(c => c.published)
    : publishedFilter === "draft"
    ? courses.filter(c => !c.published)
    : courses;

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete course");
      }
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      setDeleteTarget(null);
    }
    setDeleting(false);
  }, [deleteTarget, router]);

  return (
    <>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this course"}"? All modules, lessons, enrollments, and submissions related to this course will be permanently removed.`}
        loading={deleting}
      />

      {/* Filter tabs */}
      <div className="flex gap-1.5 rounded-xl p-1 border m-4" style={{ background: "var(--secondary-background)", borderColor: "var(--border)" }}>
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setPublishedFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              publishedFilter === f
                ? "shadow-sm border"
                : ""
            }`}
            style={
              publishedFilter === f
                ? { background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }
                : { color: "var(--muted-foreground)" }
            }
            onMouseEnter={e => {
              if (publishedFilter !== f) (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
            }}
            onMouseLeave={e => {
              if (publishedFilter !== f) (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)";
            }}
          >
            {f === "all" ? `All (${courses.length})` : f === "published" ? `Published (${courses.filter(c => c.published).length})` : `Draft (${courses.filter(c => !c.published).length})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Course</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Instructor</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Enrolled</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Status</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCourses.map((c) => (
              <tr key={c.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--foreground)" }}>{c.title}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{c.creator?.name || "Unknown"}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{c._count.enrollments}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
                    {c.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setDeleteTarget({ id: c.id, title: c.title })}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: "#D9252A" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(217,37,42,0.08)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
