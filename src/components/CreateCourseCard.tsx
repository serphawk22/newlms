"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusCircle, X, Upload, Loader2, Trash2, HelpCircle,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, FileText
} from "lucide-react";

interface ParsedQuestion {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctOption: number;
}

interface CreateCourseCardProps {
  orgId: string;
  creatorId: string;
  role: string;
}

export function CreateCourseCard({ orgId, creatorId, role }: CreateCourseCardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // PDF import state
  const [pdfStage, setPdfStage] = useState<"idle" | "parsing" | "preview" | "error">("idle");
  const [pdfQuestions, setPdfQuestions] = useState<ParsedQuestion[]>([]);
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [pdfExpandedIdx, setPdfExpandedIdx] = useState<number | null>(null);

  // Manual MCQ form state
  const [manualText, setManualText] = useState("");
  const [manualOpts, setManualOpts] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [manualCorrect, setManualCorrect] = useState(0);

  const isInstructor = role === "INSTRUCTOR";

  const handleOpen = () => {
    setTitle("");
    setQuestions([]);
    setCreateError("");
    setPdfStage("idle");
    setPdfQuestions([]);
    setPdfFileName("");
    setPdfError("");
    setManualText("");
    setManualOpts(["", "", "", ""]);
    setManualCorrect(0);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isCreating) {
      setIsOpen(false);
    }
  };

  // PDF Upload handler
  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setPdfError("Only PDF files are supported.");
      setPdfStage("error");
      return;
    }

    setPdfFileName(file.name);
    setPdfStage("parsing");
    setPdfError("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/courses/import-join-mcqs", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setPdfError(data.error ?? "Failed to extract questions.");
        setPdfStage("error");
        return;
      }

      setPdfQuestions(data.questions ?? []);
      setPdfStage("preview");
      setPdfExpandedIdx(null);
    } catch {
      setPdfError("Network error — please try again.");
      setPdfStage("error");
    }
  };

  const addPdfQuestions = () => {
    setQuestions((prev) => [...prev, ...pdfQuestions]);
    setPdfStage("idle");
    setPdfQuestions([]);
    setPdfFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Manual MCQ handler
  const addManualQuestion = () => {
    if (!manualText.trim()) return;
    if (manualOpts.some((o) => !o.trim())) {
      alert("Please fill in all 4 options.");
      return;
    }

    const newQ: ParsedQuestion = {
      id: "q_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      text: manualText.trim(),
      options: [...manualOpts] as [string, string, string, string],
      correctOption: manualCorrect,
    };

    setQuestions((prev) => [...prev, newQ]);
    setManualText("");
    setManualOpts(["", "", "", ""]);
    setManualCorrect(0);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Create course handler
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/instructor/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          orgId,
          joinQuestions: questions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create course.");
        setIsCreating(false);
        return;
      }

      // Redirect to course details
      router.push(`/instructor/courses/${data.courseId}`);
    } catch {
      setCreateError("Network error. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <>
      <Card
        onClick={handleOpen}
        style={{
          border: "2px dashed var(--border)",
          background: "rgba(255,255,255,0.02)",
          boxShadow: "none",
        }}
        className="flex flex-col justify-center min-h-[220px] transition-colors hover:bg-[rgba(217,37,42,0.04)] hover:border-[#D9252A] group cursor-pointer"
      >
        <CardContent className="pt-6 flex flex-col items-center justify-center h-full space-y-3">
          <PlusCircle className="w-10 h-10 text-slate-400 group-hover:text-[#D9252A] transition-colors" />
          <p className="font-semibold text-sm uppercase tracking-wider text-slate-400 group-hover:text-[#D9252A] transition-colors">
            Create Course
          </p>
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border bg-slate-900 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#D9252A]" />
                <h2 className="text-lg font-bold text-slate-100">Create New Course</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isCreating}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Area */}
            <form onSubmit={handleCreateCourse} className="flex-1 overflow-y-auto p-6 space-y-6">
              {createError && (
                <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-950/40 border border-red-900/60 text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Title input */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-300 font-semibold">Course Title</Label>
                <Input
                  id="title"
                  required
                  placeholder="e.g. Introduction to Machine Learning"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    background: "var(--secondary-background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A]"
                />
              </div>

              {/* Join Screening questions (Instructor ONLY) */}
              {isInstructor && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div>
                    <Label className="text-slate-300 font-bold text-sm block">Join Screening MCQ Questions (Optional)</Label>
                    <p className="text-xs text-slate-400 mt-1">
                      Students will be prompted to answer these MCQs when they request to enroll.
                    </p>
                  </div>

                  {/* PDF Importer Component inline code */}
                  <div className="rounded-xl border border-dashed border-[#D9252A]/60 bg-[#D9252A]/5 overflow-hidden p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#D9252A]" />
                      <span className="text-sm font-semibold text-[#D9252A]">Import Questions from PDF</span>
                    </div>

                    {pdfStage === "idle" && (
                      <div className="flex flex-col items-center py-2">
                        <label
                          htmlFor="pdf-upload-card"
                          className="flex items-center gap-2 cursor-pointer bg-[#D9252A] hover:bg-[#C21F24] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Choose PDF File
                        </label>
                        <input
                          ref={fileInputRef}
                          id="pdf-upload-card"
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={handlePdfChange}
                        />
                      </div>
                    )}

                    {pdfStage === "parsing" && (
                      <div className="flex items-center gap-2 py-2 text-slate-400 text-xs">
                        <Loader2 className="w-4 h-4 text-[#D9252A] animate-spin" />
                        <span>Analyzing &ldquo;{pdfFileName}&rdquo; using OpenAI AI…</span>
                      </div>
                    )}

                    {pdfStage === "error" && (
                      <div className="space-y-2 text-xs">
                        <p className="text-red-400">{pdfError}</p>
                        <Button variant="outline" size="sm" type="button" onClick={() => setPdfStage("idle")} className="h-7 text-xs">
                          Try Again
                        </Button>
                      </div>
                    )}

                    {pdfStage === "preview" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>{pdfQuestions.length} questions extracted</span>
                          <button type="button" onClick={() => setPdfStage("idle")} className="hover:text-red-400">Cancel</button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {pdfQuestions.map((q, idx) => (
                            <div key={idx} className="rounded border border-slate-700 bg-slate-800 text-xs overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setPdfExpandedIdx(pdfExpandedIdx === idx ? null : idx)}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-left text-slate-300"
                              >
                                <span className="truncate pr-2">{idx + 1}. {q.text}</span>
                                {pdfExpandedIdx === idx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              {pdfExpandedIdx === idx && (
                                <div className="px-3 pb-2 pt-1 border-t border-slate-700 space-y-1">
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className={`px-2 py-1 rounded text-[11px] ${
                                      q.correctOption === oIdx ? "text-emerald-400 font-semibold bg-emerald-950/20" : "text-slate-400"
                                    }`}>
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          onClick={addPdfQuestions}
                          size="sm"
                          className="w-full bg-[#D9252A] hover:bg-[#C21F24] text-white font-semibold text-xs h-8"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Add All {pdfQuestions.length} Questions
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Manual Question Form */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                    <Label className="text-slate-300 font-semibold text-xs uppercase tracking-wider block">Add Question Manually</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter question..."
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        style={{
                          background: "var(--card)",
                          borderColor: "var(--border)",
                          color: "var(--foreground)",
                        }}
                        className="focus-visible:ring-1 focus-visible:ring-[#D9252A] h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {manualOpts.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="manualCorrectOption"
                            checked={manualCorrect === idx}
                            onChange={() => setManualCorrect(idx)}
                            className="accent-[#D9252A] shrink-0"
                          />
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...manualOpts];
                              newOpts[idx] = e.target.value;
                              setManualOpts(newOpts as [string, string, string, string]);
                            }}
                            style={{
                              background: "var(--card)",
                              borderColor: "var(--border)",
                              color: "var(--foreground)",
                            }}
                            className="focus-visible:ring-1 focus-visible:ring-[#D9252A] h-8 text-xs"
                          />
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={addManualQuestion}
                      style={{
                        background: "var(--secondary-background)",
                        color: "var(--foreground)",
                        border: "1px solid var(--border)",
                      }}
                      className="w-full hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A] h-8 text-xs font-semibold"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add to Screening Test
                    </Button>
                  </div>

                  {/* List of configured questions */}
                  {questions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-slate-300 font-semibold text-xs uppercase tracking-wider block">
                        Configured Questions ({questions.length})
                      </Label>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {questions.map((q, idx) => (
                          <div key={q.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-800 bg-slate-800/30 gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200">
                                {idx + 1}. {q.text}
                              </p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px]">
                                {q.options.map((opt, oIdx) => (
                                  <span key={oIdx} className={q.correctOption === oIdx ? "text-emerald-400 font-semibold" : "text-slate-400"}>
                                    {String.fromCharCode(65 + oIdx)}. {opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeQuestion(q.id)}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isCreating}
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCourse}
                disabled={isCreating || !title.trim()}
                className="bg-[#D9252A] hover:bg-[#C21F24] text-white font-semibold flex items-center gap-1.5"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Course...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Create Course
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
