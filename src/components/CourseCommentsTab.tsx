"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Send, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
}

interface CourseComment {
  id: string;
  content: string;
  createdAt: string;
  author: UserInfo;
  replies?: CourseComment[];
}

interface Props {
  courseId: string;
}

export function CourseCommentsTab({ courseId }: Props) {
  const [comments, setComments] = useState<CourseComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/comments`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load discussions.");
        return;
      }
      setComments(data.comments ?? []);
    } catch {
      setError("Network error — please refresh.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent, parentId }),
      });
      if (res.ok) {
        setReplyContent("");
        setReplyingTo(null);
        fetchComments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--muted-foreground)" }}>
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-3 text-sm">Loading discussions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Q&A / Discussions</h3>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Ask questions, discuss topics, and get answers from your instructor and peers.
      </p>

      {/* New Comment Input */}
      <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <Textarea
          placeholder="Ask a question or start a discussion..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[100px] resize-none mb-3"
        />
        <div className="flex justify-end">
          <Button
            onClick={handlePostComment}
            disabled={submitting || !newComment.trim()}
                      style={{ background: "#D9252A", color: "#FFFFFF" }}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Post
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-center py-4 rounded-xl text-sm" style={{ background: "rgba(217,37,42,0.08)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
          {error}
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4 mt-8">
        {comments.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="font-medium" style={{ color: "var(--foreground)" }}>No discussions yet.</p>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>Be the first to ask a question!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-xl p-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              {/* Parent Comment */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(217,37,42,0.12)" }}>
                  <span className="text-sm font-black" style={{ color: "#D9252A" }}>
                    {(comment.author.name ?? "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{comment.author.name ?? "User"}</span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{fmt(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>{comment.content}</p>
                  
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyContent("");
                      }}
                      className="text-xs font-semibold flex items-center transition-colors" style={{ color: "var(--muted-foreground)" }}
                    >
                      <Reply className="w-3.5 h-3.5 mr-1" />
                      Reply
                    </button>
                  </div>
                </div>
              </div>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="ml-14 mt-4 p-4 rounded-xl" style={{ background: "var(--secondary-background, var(--card))", border: "1px solid var(--border)" }}>
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[80px] resize-none mb-3"
                    style={{ background: "var(--card)", color: "var(--foreground)" }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePostReply(comment.id)}
                      disabled={submittingReply || !replyContent.trim()}
            style={{ background: "#D9252A", color: "#FFFFFF" }}
                    >
                      {submittingReply ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                      Reply
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies List */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-14 space-y-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--muted)" }}>
                        <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
                          {(reply.author.name ?? "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-xs" style={{ color: "var(--foreground)" }}>{reply.author.name ?? "User"}</span>
                          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{fmt(reply.createdAt)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
