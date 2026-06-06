"use client";

import { useRef, useState } from "react";
import {
  Upload, FileText, CheckCircle2, Loader2,
  ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParsedQuestion {
  text: string;
  options: [string, string, string, string];
  correctOption: number;
}

interface QuizPdfImporterProps {
  quizId: string;
  courseId: string;
}

export function QuizPdfImporter({ quizId, courseId }: QuizPdfImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<"idle" | "parsing" | "preview" | "saving" | "done" | "error">("idle");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [error, setError] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [collapsed, setCollapsed] = useState(true);

  const reset = () => {
    setStage("idle");
    setQuestions([]);
    setError("");
    setExpanded(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      setStage("error");
      return;
    }

    setFileName(file.name);
    setStage("parsing");
    setError("");
    setQuestions([]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("quizId", quizId);
      fd.append("courseId", courseId);
      fd.append("saveNow", "false");

      const res = await fetch("/api/quiz/import-pdf", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to extract questions.");
        setStage("error");
        return;
      }

      setQuestions(data.questions ?? []);
      setStage("preview");
      setExpanded(null);
    } catch {
      setError("Network error — please try again.");
      setStage("error");
    }
  };

  const handleSave = async () => {
    if (questions.length === 0) return;
    setStage("saving");

    try {
      const res = await fetch("/api/quiz/bulk-save-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, courseId, questions }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save questions.");
        setStage("error");
        return;
      }

      setStage("done");
      // Reload the page after a short delay so server-rendered quiz refreshes
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch {
      setError("Network error while saving. Please try again.");
      setStage("error");
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-[#D9252A] bg-[rgba(217,37,42,0.04)] overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(217,37,42,0.06)] transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[rgba(217,37,42,0.08)] flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-[#D9252A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#D9252A]">Import Questions from PDF</p>
          <p className="text-xs text-[#D9252A]">Upload a PDF — AI will extract MCQ questions automatically</p>
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-[#D9252A] shrink-0" />
          : <ChevronUp className="w-4 h-4 text-[#D9252A] shrink-0" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* IDLE */}
          {stage === "idle" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-xs text-slate-500 text-center max-w-xs">
                Upload a PDF to extract questions.
              </p>
              <label
                htmlFor={`pdf-upload-${quizId}`}
                className="flex items-center gap-2 cursor-pointer bg-[#D9252A] hover:bg-[#C21F24] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Choose PDF File
              </label>
              <input
                ref={inputRef}
                id={`pdf-upload-${quizId}`}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* PARSING */}
          {stage === "parsing" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-[#D9252A] animate-spin" />
              <p className="text-sm font-medium text-slate-600">Analysing &ldquo;{fileName}&rdquo;…</p>
              <p className="text-xs text-slate-400">Extracting text and generating questions with AI</p>
            </div>
          )}

          {/* ERROR */}
          {stage === "error" && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="text-xs">
                Try Again
              </Button>
            </div>
          )}

          {/* PREVIEW */}
          {stage === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {questions.length} question{questions.length !== 1 ? "s" : ""} extracted from &ldquo;{fileName}&rdquo;
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-slate-400 hover:text-red-500">
                  Cancel
                </Button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === idx ? null : idx)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xs font-medium text-slate-700 truncate pr-2">
                        {idx + 1}. {q.text}
                      </span>
                      {expanded === idx
                        ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    </button>
                    {expanded === idx && (
                      <div className="px-3 pb-3 space-y-1.5 border-t border-slate-100 pt-2">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border ${
                              q.correctOption === oIdx
                                ? "bg-green-50 border-green-200 text-green-700 font-medium"
                                : "bg-slate-50 border-slate-100 text-slate-600"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              q.correctOption === oIdx ? "border-green-500" : "border-slate-300"
                            }`}>
                              {q.correctOption === oIdx && (
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                              )}
                            </span>
                            <span className="truncate">{opt}</span>
                            {q.correctOption === oIdx && (
                              <span className="ml-auto text-[10px] font-semibold text-green-600 shrink-0">✓ Correct</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSave}
                className="w-full bg-[#D9252A] hover:bg-[#C21F24] text-white font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Add All {questions.length} Questions to Quiz
              </Button>
            </div>
          )}

          {/* SAVING */}
          {stage === "saving" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-[#D9252A] animate-spin" />
              <p className="text-sm font-medium text-slate-600">Saving {questions.length} questions…</p>
            </div>
          )}

          {/* DONE */}
          {stage === "done" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">
                {questions.length} questions saved! Refreshing…
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
