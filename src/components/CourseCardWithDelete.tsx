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
        <Card className="border-zinc-200 shadow-sm flex flex-col hover:border-zinc-300 hover:shadow-md transition-all duration-200 group">
          <CardHeader className="pb-3 border-b border-zinc-100 bg-white rounded-t-xl relative">
            <Button
              onClick={() => setShowConfirm(true)}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base leading-tight font-bold text-zinc-900 group-hover:text-violet-700 transition-colors line-clamp-2">
                  {course.title}
                </CardTitle>
                <p className="text-[10px] text-zinc-500 font-medium">By {course.creator?.name || "Unknown"}</p>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md whitespace-nowrap uppercase tracking-wider shrink-0 ${
                course.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}>
                {course.published ? "Published" : "Draft"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-0">
            <div className="grid grid-cols-2 gap-px bg-zinc-100 p-4 flex-1 content-start">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Students</span>
                <span className="text-sm font-black text-zinc-700">{course._count.enrollments}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Modules</span>
                <span className="text-sm font-black text-zinc-700">{course._count.modules}</span>
              </div>
              <div className="flex flex-col gap-1 mt-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quizzes</span>
                <span className="text-sm font-black text-zinc-700">{course._count.quizzes}</span>
              </div>
              <div className="flex flex-col gap-1 mt-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Assignments</span>
                <span className="text-sm font-black text-zinc-700">{course._count.assignments}</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 rounded-b-xl border-t border-zinc-100 mt-auto">
              <Link href={`/instructor/courses/${course.id}`}>
                <Button className="w-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 font-bold text-sm shadow-sm transition-all group-hover:border-zinc-300">
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
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-zinc-900 mb-1">
                    Delete Course
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    Are you sure you want to delete <strong className="text-zinc-700">{course.title}</strong>? This action cannot be undone. All modules, lessons, assignments, quizzes, and live sessions will be permanently removed.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button
                      onClick={() => setShowConfirm(false)}
                      variant="outline"
                      className="border-zinc-200 text-zinc-700"
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
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
