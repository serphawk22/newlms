"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteLessonButton({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this lesson? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/instructor/lessons/${lessonId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to delete lesson");
        setDeleting(false);
        return;
      }

      router.push(`/instructor/courses/${courseId}`);
      router.refresh();
    } catch (error) {
      alert("Failed to delete lesson");
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      className="w-full text-red-600 hover:text-red-700 hover:bg-red-100 text-xs justify-start px-2"
      onClick={handleDelete}
      disabled={deleting}
    >
      <Trash2 className="w-3 h-3 mr-2" />
      {deleting ? "Deleting..." : "Delete this Lesson"}
    </Button>
  );
}
