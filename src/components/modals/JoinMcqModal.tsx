"use client";

import { useState } from "react";
import { X, HelpCircle, AlertCircle, CheckCircle2, Lock, ArrowRight } from "lucide-react";
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
  courseId: string;
  questions: Question[];
  onSubmit: (answers: Record<string, number>) => void;
  submitting: boolean;
}

export function JoinMcqModal({
  isOpen,
  onClose,
  courseTitle,
  courseId,
  questions,
  onSubmit,
  submitting,
}: JoinMcqModalProps) {
  const [activeTab, setActiveTab] = useState<"quiz" | "enroll">("quiz");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  // Quiz grading states
  const [attempted, setAttempted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSelect = (qId: string, optIdx: number) => {
    if (quizPassed) return; // Locked once passed
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
    setError("");
  };

  const handleAttemptQuiz = async () => {
    // Verify all questions are answered
    const unanswered = questions.some((q) => answers[q.id] === undefined);
    if (unanswered) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setGrading(true);
    setError("");

    try {
      const res = await fetch("/api/courses/attempt-join-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, answers }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to grade quiz.");
        setGrading(false);
        return;
      }

      setScore(data.score);
      setTotal(data.totalQuestions);
      setQuizPassed(data.passed);
      setAttempted(true);

      if (data.passed) {
        // Automatically switch to enrollment tab
        setActiveTab("enroll");
      } else {
        setError(`Quiz attempt failed (Score: ${data.score}/${data.totalQuestions}). You need at least 50% correct options. Please try again.`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGrading(false);
    }
  };

  const handleResetQuiz = () => {
    setAnswers({});
    setAttempted(false);
    setQuizPassed(false);
    setScore(0);
    setTotal(0);
    setError("");
    setActiveTab("quiz");
  };

  const handleRequestAccess = () => {
    if (!quizPassed) return;
    onSubmit(answers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border bg-slate-900 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#D9252A]" />
            <h2 className="text-lg font-bold text-slate-100">Course Join Screening</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 bg-slate-900 shrink-0">
          <button
            onClick={() => setActiveTab("quiz")}
            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "quiz"
                ? "border-[#D9252A] text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Attempt Quiz
          </button>
          <button
            disabled={!quizPassed}
            onClick={() => setActiveTab("enroll")}
            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "enroll"
                ? "border-[#D9252A] text-slate-100"
                : !quizPassed
                ? "border-transparent text-slate-600 cursor-not-allowed"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {!quizPassed && <Lock className="w-3.5 h-3.5" />}
            Request Access
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-lg bg-slate-800/50 border border-slate-800 p-4">
            <p className="text-xs text-slate-300">
              Course: <strong>{courseTitle}</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              You must score at least 50% correct answers on this screening test to unlock the enrollment request.
            </p>
          </div>

          {error && (
            <div className={`flex items-start gap-2 p-3 text-sm rounded-lg border ${
              quizPassed
                ? "bg-emerald-950/40 border-emerald-900/60 text-emerald-400"
                : "bg-red-950/40 border-red-900/60 text-red-400"
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "quiz" ? (
            <div className="space-y-6">
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
                            disabled={quizPassed}
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

              {!quizPassed && (
                <Button
                  onClick={handleAttemptQuiz}
                  disabled={grading}
                  className="w-full bg-[#D9252A] hover:bg-[#C21F24] text-white font-semibold h-11"
                >
                  {grading ? "Grading attempt..." : "Submit Quiz Attempt"}
                </Button>
              )}

              {quizPassed && (
                <div className="text-center space-y-2 py-2">
                  <p className="text-sm text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5" /> Screening quiz passed!
                  </p>
                  <Button
                    onClick={() => setActiveTab("enroll")}
                    className="bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Proceed to Request Access <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-100">Screening Quiz Passed!</h3>
                <p className="text-sm text-slate-300">
                  You scored <strong>{score}/{total}</strong> and have met the eligibility criteria.
                </p>
                <p className="text-xs text-slate-400">
                  You can now submit your request to join the course. The instructor will review your score and enroll you.
                </p>
              </div>

              <div className="pt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleResetQuiz}
                  disabled={submitting}
                  className="flex-1 text-slate-400 hover:text-slate-200 border-slate-700"
                >
                  Retake Quiz
                </Button>
                <Button
                  onClick={handleRequestAccess}
                  disabled={submitting}
                  className="flex-1 bg-[#D9252A] hover:bg-[#C21F24] text-white font-semibold"
                >
                  {submitting ? "Submitting Request..." : "Request Access"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
