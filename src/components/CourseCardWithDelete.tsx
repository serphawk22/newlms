"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface CourseData {
  id: string;
  title: string;
  published: boolean;
  creator: { name: string | null } | null;
  _count: {
    enrollments: number;
    modules: number;
    assignments: number;
    quizzes: number;
  };
}

export function CourseCardWithDelete({ course }: { course: CourseData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/instructor/courses/${course.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast("success", "Course deleted successfully");
      router.refresh();
    } catch {
      toast("error", "Failed to delete course. Please try again.");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div>
        <Card
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
          className="flex flex-col hover:border-[#D9252A] transition-all duration-200 group"
        >
          <CardHeader
            style={{ borderBottom: "1px solid var(--border)", background: "transparent" }}
            className="pb-3 rounded-t-xl relative"
          >
            <Button
              onClick={() => setShowConfirm(true)}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 transition-colors h-8 w-8 p-0"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "#D9252A";
                e.currentTarget.style.background = "rgba(217,37,42,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--muted-foreground)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <CardTitle
                  style={{ color: "var(--foreground)" }}
                  className="text-base leading-tight font-bold group-hover:text-[#D9252A] transition-colors line-clamp-2"
                >
                  {course.title}
                </CardTitle>
                <p className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                  By {course.creator?.name || "Unknown"}
                </p>
              </div>
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-md whitespace-nowrap uppercase tracking-wider shrink-0 border"
                style={
                  course.published
                    ? { background: "rgba(217,37,42,0.12)", color: "#D9252A", borderColor: "rgba(217,37,42,0.25)" }
                    : { background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)", borderColor: "var(--border)" }
                }
              >
                {course.published ? "Published" : "Draft"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-0">
            <div
              style={{ background: "var(--secondary-background)" }}
              className="grid grid-cols-2 gap-px p-4 flex-1 content-start"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Students</span>
                <span className="text-sm font-black" style={{ color: "var(--foreground)" }}>{course._count.enrollments}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Modules</span>
                <span className="text-sm font-black" style={{ color: "var(--foreground)" }}>{course._count.modules}</span>
              </div>
              <div className="flex flex-col gap-1 mt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Quizzes</span>
                <span className="text-sm font-black" style={{ color: "var(--foreground)" }}>{course._count.quizzes}</span>
              </div>
              <div className="flex flex-col gap-1 mt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Assignments</span>
                <span className="text-sm font-black" style={{ color: "var(--foreground)" }}>{course._count.assignments}</span>
              </div>
            </div>

            <div
              style={{ background: "var(--secondary-background)", borderTop: "1px solid var(--border)" }}
              className="p-4 rounded-b-xl mt-auto"
            >
              <Link href={`/instructor/courses/${course.id}`}>
                <Button
                  style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  className="w-full hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A] font-bold text-sm shadow-sm transition-all"
                >
                  <Settings className="w-4 h-4 mr-2" /> Manage Content
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              className="rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(217,37,42,0.12)", border: "1px solid rgba(217,37,42,0.25)" }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: "#D9252A" }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold mb-1" style={{ color: "var(--foreground)" }}>
                    Delete Course
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
                    Are you sure you want to delete <strong style={{ color: "var(--foreground)" }}>{course.title}</strong>? This action cannot be undone. All modules, lessons, assignments, quizzes, and live sessions will be permanently removed.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button
                      onClick={() => setShowConfirm(false)}
                      variant="outline"
                      style={{ background: "var(--secondary-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                      className="hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelete}
                      style={{ background: "#D9252A", color: "#FFFFFF" }}
                      className="hover:bg-[#C21F24]"
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
