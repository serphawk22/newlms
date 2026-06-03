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
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{message}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
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

export function CoursesClient({ courses }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Course</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Instructor</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Enrolled</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Status</th>
              <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-zinc-900">{c.title}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{c.creator?.name || "Unknown"}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{c._count.enrollments}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    c.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {c.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setDeleteTarget({ id: c.id, title: c.title })}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
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
