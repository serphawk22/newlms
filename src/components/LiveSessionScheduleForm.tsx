"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import BarsLoader from "@/components/ui/bars-loader";
import { Input } from "@/components/ui/input";

type ActionState = {
  error?: string;
  success?: boolean;
};

type LiveSessionScheduleFormProps = {
  courseId: string;
  moduleId: string;
  createLiveSessionAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

const initialState: ActionState = {};

export function LiveSessionScheduleForm({
  courseId,
  moduleId,
  createLiveSessionAction,
}: LiveSessionScheduleFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSubmitting) return;

        const titleInput = formRef.current?.elements.namedItem("title") as HTMLInputElement | null;
        const title = titleInput?.value.trim() ?? "";
        if (!title) {
          setError("Please enter a session title");
          titleInput?.focus();
          return;
        }

        const form = formRef.current;
        if (!form) return;

        setError("");
        setIsSubmitting(true);

        try {
          const result = await createLiveSessionAction(initialState, new FormData(form));
          if (result.error) {
            setError(result.error);
            return;
          }

          form.reset();
          router.refresh();
        } catch {
          setError("Failed to create session");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <div className="flex gap-2">
        <Input
          name="title"
          placeholder="Session Title..."
          className={`h-8 text-sm flex-1 ${error === "Please enter a session title" ? "border-red-400" : ""}`}
          aria-invalid={error === "Please enter a session title"}
          onChange={() => {
            if (error === "Please enter a session title") setError("");
          }}
        />
        <Input name="scheduledAt" type="datetime-local" className="h-8 text-sm flex-1 bg-white" required />
        <Button type="submit" size="sm" className="h-8 bg-slate-900 text-white" disabled={isSubmitting}>
          {isSubmitting && <BarsLoader size="sm" />}
          {isSubmitting ? "Scheduling..." : "Schedule"}
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </form>
  );
}
