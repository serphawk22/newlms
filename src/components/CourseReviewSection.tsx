"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface ReviewStudent {
  id: string;
  name: string | null;
  email: string;
}
interface Review {
  id: string;
  rating: number;
  comment: string;
  courseId: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
  student: ReviewStudent;
}
interface ReviewsData {
  reviews: Review[];
  avgRating: number | null;
  total: number;
}

/* ─── Star display ───────────────────────────────────────────────────────────── */
function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
        />
      ))}
    </span>
  );
}

/* ─── Interactive star selector ─────────────────────────────────────────────── */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              s <= (hovered || value) ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-100"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ─── Time formatter ─────────────────────────────────────────────────────────── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export function CourseReviewSection({
  courseId,
  currentStudentId,
}: {
  courseId: string;
  currentStudentId: string | null;
}) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Fetch reviews ── */
  const fetchReviews = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/reviews?courseId=${courseId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load reviews");
      const json: ReviewsData = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchReviews(false);
    intervalRef.current = setInterval(() => fetchReviews(true), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchReviews]);

  /* ── Find current student's existing review ── */
  const myReview = currentStudentId
    ? data?.reviews.find((r) => r.studentId === currentStudentId) ?? null
    : null;

  /* ── Submit new review ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudentId) return;
    if (!comment.trim()) { setFormError("Please write a comment."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, rating, comment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit review");
      setComment("");
      setRating(5);
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3000);
      await fetchReviews(true);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Start editing ── */
  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  /* ── Submit edit ── */
  const handleEdit = async (reviewId: string) => {
    if (!editComment.trim()) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editRating, comment: editComment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update");
      setEditingId(null);
      await fetchReviews(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ── Delete review ── */
  const handleDelete = async (reviewId: string) => {
    if (!confirm("Delete your review? This cannot be undone.")) return;
    setDeletingId(reviewId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete");
      }
      await fetchReviews(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--muted-foreground)" }}>
        <RingLoader size="sm" className="inline-flex" /> Loading reviews…
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex flex-col items-center py-16 gap-3" style={{ color: "var(--accent)" }}>
        <p className="font-medium">{error}</p>
        <Button variant="outline" onClick={() => fetchReviews(false)}>Retry</Button>
      </div>
    );
  }

  const reviews = data?.reviews ?? [];
  const avgRating = data?.avgRating ?? null;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h3 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Course Reviews</h3>
      </div>

      {/* Average rating summary */}
      {total > 0 && avgRating !== null && (
        <Card className="shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
          <CardContent className="p-6 flex items-center gap-6">
            <div className="text-center">
              <p className="text-5xl font-black" style={{ color: "var(--foreground)" }}>{avgRating.toFixed(1)}</p>
              <StarDisplay rating={Math.round(avgRating)} size="lg" />
              <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{total} review{total !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => r.rating === star).length;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-right" style={{ color: "var(--muted-foreground)" }}>{star}</span>
                    <Star className="w-3 h-3" style={{ fill: "#D9252A", color: "#D9252A" }} />
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Form — only if logged in and hasn't reviewed yet */}
      {currentStudentId && !myReview && (
        <Card className="shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
          <CardContent className="p-6">
            <h4 className="font-bold mb-4" style={{ color: "var(--foreground)" }}>Write a Review</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--muted-foreground)" }}>Your Rating</label>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--muted-foreground)" }}>Your Review</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this course…"
                  rows={4}
                  required
                  className="w-full rounded-lg p-3 text-sm resize-none"
                  style={{ border: "1px solid var(--border)", background: "var(--secondary-background)", color: "var(--foreground)" }}
                />
              </div>
              {formError && (
                <div className="flex items-center gap-2 text-sm rounded-lg p-3" style={{ color: "var(--accent)", background: "rgba(217,37,42,0.12)", border: "1px solid rgba(217,37,42,0.25)" }}>
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="text-sm rounded-lg p-3" style={{ color: "var(--foreground)", background: "var(--muted)", border: "1px solid var(--border)" }}>
                  Review submitted successfully!
                </div>
              )}
              <Button
                type="submit"
                disabled={submitting}
                style={{ background: "var(--foreground)", color: "var(--background)" }}
              >
                {submitting ? <><RingLoader size="sm" className="inline-flex mr-2" /> Submitting…</> : "Submit Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Not logged in notice */}
      {!currentStudentId && (
        <div className="text-center py-8 rounded-xl text-sm" style={{ border: "1px dashed var(--border)", color: "var(--muted-foreground)" }}>
          Sign in to leave a review.
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-16 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)" }}>
          No reviews yet. Be the first to review this course!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isOwner = review.studentId === currentStudentId;
            const isEditing = editingId === review.id;
            const isDeleting = deletingId === review.id;

            return (
              <Card
                key={review.id}
                className="shadow-sm"
                style={{ border: `1px solid var(--border)`, background: "var(--card)" }}
              >
                <CardContent className="p-6">
                  {/* Review header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                        {(review.student.name ?? review.student.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                          {review.student.name ?? review.student.email}
                          {isOwner && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                              You
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarDisplay rating={isEditing ? editRating : review.rating} />
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{timeAgo(review.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                  {/* Owner actions */}
                    {isOwner && !isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0"
                          style={{ color: "var(--muted-foreground)" }}
                          onClick={() => startEdit(review)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0"
                          style={{ color: "var(--muted-foreground)" }}
                          onClick={() => handleDelete(review.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <RingLoader size="sm" className="inline-flex" /> : "Delete"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Inline edit form */}
                  {isEditing ? (
                    <div className="space-y-3 mt-2">
                      <StarPicker value={editRating} onChange={setEditRating} />
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg p-3 text-sm resize-none"
                        style={{ border: "1px solid var(--border)", background: "var(--secondary-background)", color: "var(--foreground)" }}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(review.id)}
                          disabled={editSubmitting}
                          style={{ background: "var(--foreground)", color: "var(--background)" }}
                        >
                          {editSubmitting ? <RingLoader size="sm" className="inline-flex mr-1" /> : null}
                          Save Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          disabled={editSubmitting}
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{review.comment}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
