"use client";
import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Loader2, Send, Reply, User as UserIcon } from "lucide-react";
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-3 text-sm text-slate-400">Loading discussions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-slate-800">Q&A / Discussions</h3>
      </div>
      <p className="text-sm text-slate-500">
        Ask questions, discuss topics, and get answers from your instructor and peers.
      </p>

      {/* New Comment Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
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
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Post
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-center py-4 bg-red-50 text-red-500 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4 mt-8">
        {comments.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No discussions yet.</p>
            <p className="text-sm text-slate-400 mt-1">Be the first to ask a question!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              {/* Parent Comment */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-blue-700">
                    {(comment.author.name ?? "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-slate-800">{comment.author.name ?? "User"}</span>
                    <span className="text-xs text-slate-400">{fmt(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                  
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyContent("");
                      }}
                      className="text-xs font-semibold flex items-center text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      <Reply className="w-3.5 h-3.5 mr-1" />
                      Reply
                    </button>
                  </div>
                </div>
              </div>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="ml-14 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[80px] resize-none mb-3 bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePostReply(comment.id)}
                      disabled={submittingReply || !replyContent.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {submittingReply ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                      Reply
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies List */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-14 space-y-4 mt-4 pt-4 border-t border-slate-100">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-600">
                          {(reply.author.name ?? "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-xs text-slate-800">{reply.author.name ?? "User"}</span>
                          <span className="text-[10px] text-slate-400">{fmt(reply.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{reply.content}</p>
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
