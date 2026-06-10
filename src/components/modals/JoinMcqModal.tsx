"use client";

import { useState } from "react";
import { X, HelpCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
}

interface JoinMcqModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  questions: Question[];
  onSubmit: (answers: Record<string, number>) => void;
  submitting: boolean;
}

export function JoinMcqModal({
  isOpen,
  onClose,
  courseTitle,
  questions,
  onSubmit,
  submitting,
}: JoinMcqModalProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSelect = (qId: string, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
    setError("");
  };

  const handleSubmit = () => {
    // Verify all questions are answered
    const unanswered = questions.some((q) => answers[q.id] === undefined);
    if (unanswered) {
      setError("Please answer all questions before submitting.");
      return;
    }
    onSubmit(answers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border bg-slate-900 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#D9252A]" />
            <h2 className="text-lg font-bold text-slate-100">Course Screening Test</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-lg bg-slate-800/50 border border-slate-800 p-4">
            <p className="text-sm text-slate-300">
              To request joining <strong>{courseTitle}</strong>, please answer the screening questions configured by the instructor.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-950/40 border border-red-900/60 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-3">
                <p className="text-sm font-semibold text-slate-200">
                  {idx + 1}. {q.text}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = answers[q.id] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelect(q.id, oIdx)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${
                          isSelected
                            ? "bg-[#D9252A]/10 border-[#D9252A]/40 text-slate-100 font-medium"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-800/80"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-[#D9252A]" : "border-slate-500"
                        }`}>
                          {isSelected && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#D9252A]" />
                          )}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-200">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#D9252A] hover:bg-[#C21F24] text-white font-semibold"
          >
            {submitting ? "Submitting Request..." : "Submit Join Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
