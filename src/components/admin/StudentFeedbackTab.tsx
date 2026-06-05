"use client";
import { useEffect, useState, useCallback } from "react";
import { RingLoader } from "@/components/ui/ring-loader";

interface FeedbackItem {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null };
  course:  { id: string; title: string };
}

interface Props {
  courseId: string;
}

export function StudentFeedbackTab({ courseId }: Props) {
  const [comments, setComments] = useState<FeedbackItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/student/course-feedback?courseId=${courseId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load feedback.");
        return;
      }
      setComments(data.comments ?? []);
    } catch {
      setError("Network error — please refresh.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  function fmt(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch { return iso; }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RingLoader size="md" />
        <span className="ml-3 text-sm" style={{ color: "var(--muted-foreground)" }}>Loading feedback…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
        <p className="font-medium text-sm" style={{ color: "var(--accent)" }}>{error}</p>
        <button onClick={fetchFeedback} className="mt-3 text-xs underline" style={{ color: "var(--foreground)" }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h3 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Instructor / Admin Feedback</h3>
        {comments.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold ml-1" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
            {comments.length}
          </span>
        )}
      </div>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Comments from your instructor or admin about your performance in this course.
      </p>

      {comments.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
          <p className="font-medium" style={{ color: "var(--muted-foreground)" }}>No feedback yet.</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Your instructor will leave comments here when available.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((fb) => (
            <div key={fb.id} className="rounded-xl px-5 py-4" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                    <span className="text-xs font-bold" style={{ color: "var(--foreground)" }}>
                      {(fb.author.name ?? "A").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{fb.author.name ?? "Admin"}</p>
                    <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{fb.course.title}</p>
                  </div>
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>{fmt(fb.createdAt)}</span>
              </div>
              <p className="text-sm leading-relaxed mt-1" style={{ color: "var(--foreground)" }}>{fb.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
