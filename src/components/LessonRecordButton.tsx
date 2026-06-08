"use client";

import { useState } from "react";
import { Video, Check } from "lucide-react";
import { InstructorVideoRecorder } from "@/components/InstructorVideoRecorder";
import { useToast } from "@/components/ui/toast";

interface Props {
  courseId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  isSubmitted?: boolean;
}

export function LessonRecordButton({ courseId, moduleId, lessonId, lessonTitle, isSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSaved = () => {
    setOpen(false);
    toast("success", "Recording saved! It will appear in Recorded Videos and the admin's Learning Videos dashboard after upload.");
    // Reload the page to fetch the updated database status of the video submission
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        id={`record-video-btn-${lessonId}`}
        title="Record a video for this lesson"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
          isSubmitted
            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
            : "hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] text-var(--muted-foreground) border border-var(--border) bg-var(--secondary-background)"
        }`}
      >
        {isSubmitted ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            Submitted
          </>
        ) : (
          <>
            <Video className="w-3.5 h-3.5" />
            Record Video
          </>
        )}
      </button>

      {open && (
        <InstructorVideoRecorder
          courseId={courseId}
          moduleId={moduleId}
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
