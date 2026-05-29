"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldX, Search, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Users, FileText,
} from "lucide-react";
import { Loader } from "@/components/ui/loader";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchedSnippet {
  source: string;
  target: string;
  similarity: number;
}

interface SimilarityMatch {
  submissionId: string;
  studentName: string;
  similarityPct: number;
  matchedSnippets: MatchedSnippet[];
}

interface PlagiarismResult {
  id: string;
  submissionId: string;
  status: "PENDING" | "RUNNING" | "DONE" | "ERROR";
  similarityScore: number;
  plagiarismStatus: "SAFE" | "MEDIUM" | "HIGH";
  matches: SimilarityMatch[];
  errorMessage: string | null;
  checkedAt: string | null;
  updatedAt: string;
}

interface Props {
  submissionId: string;
  hasFile: boolean;
}

// ── Score Ring Component ──────────────────────────────────────────────────────

function ScoreRing({ score, status }: { score: number; status: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;

  const color =
    status === "HIGH" ? "#ef4444" :
    status === "MEDIUM" ? "#f59e0b" :
    "#10b981";

  const bgColor =
    status === "HIGH" ? "#fee2e2" :
    status === "MEDIUM" ? "#fef3c7" :
    "#d1fae5";

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill={bgColor} stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-black" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "SAFE" | "MEDIUM" | "HIGH" }) {
  const cfg = {
    SAFE:   { label: "Safe",   Icon: ShieldCheck, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    MEDIUM: { label: "Medium Risk", Icon: ShieldAlert, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    HIGH:   { label: "High Similarity", Icon: ShieldX,    cls: "bg-red-50 text-red-700 border-red-200" },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Snippet Pair ──────────────────────────────────────────────────────────────

function SnippetPair({ snippet }: { snippet: MatchedSnippet }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      <div className="bg-red-50 border border-red-100 rounded-lg p-2">
        <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">This Submission</p>
        <p className="text-red-900 leading-relaxed line-clamp-4">{snippet.source}</p>
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Matched Submission</p>
        <p className="text-amber-900 leading-relaxed line-clamp-4">{snippet.target}</p>
      </div>
    </div>
  );
}

// ── Match Card ────────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: SimilarityMatch }) {
  const [open, setOpen] = useState(false);
  const barColor =
    match.similarityPct > 50 ? "bg-red-500" :
    match.similarityPct > 20 ? "bg-amber-500" :
    "bg-emerald-500";

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-800 truncate">{match.studentName}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${match.similarityPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-zinc-600 shrink-0">{match.similarityPct}%</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
      </button>

      {open && match.matchedSnippets.length > 0 && (
        <div className="px-3 pb-3 space-y-2 border-t border-zinc-100 pt-2">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Matched Content ({match.matchedSnippets.length} segments)
          </p>
          {match.matchedSnippets.map((snippet, i) => (
            <SnippetPair key={i} snippet={snippet} />
          ))}
        </div>
      )}
      {open && match.matchedSnippets.length === 0 && (
        <div className="px-3 pb-3 border-t border-zinc-100 pt-2">
          <p className="text-xs text-zinc-400">No specific snippet matches found (structural similarity detected).</p>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function PlagiarismPanel({ submissionId, hasFile }: Props) {
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchResult = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plagiarism/result/${submissionId}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data.result);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    if (mounted) fetchResult();
  }, [mounted, fetchResult]);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/plagiarism/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Merge result from response
        setResult((prev) => ({
          ...(prev ?? {
            id: "", submissionId, updatedAt: new Date().toISOString(), errorMessage: null,
          }),
          status: data.status,
          similarityScore: data.similarityScore,
          plagiarismStatus: data.plagiarismStatus,
          matches: data.matches ?? [],
          checkedAt: new Date().toISOString(),
        } as PlagiarismResult));
      }
    } catch {
      // silent
    } finally {
      setChecking(false);
    }
  };

  if (!hasFile) return null;

  return (
    <div className="mt-2 border border-zinc-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50/80 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
            Plagiarism Analysis
          </span>
        </div>
        <button
          onClick={runCheck}
          disabled={checking}
          className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-400 transition-colors"
        >
          {checking ? (
            <Loader size="sm" variant="bars" />
          ) : result?.status === "DONE" ? (
            <RefreshCw className="w-3 h-3" />
          ) : (
            <Search className="w-3 h-3" />
          )}
          {checking ? "Analyzing…" : result?.status === "DONE" ? "Recheck" : "Check Plagiarism"}
        </button>
      </div>

      <div className="p-3">
        {/* Loading initial fetch */}
        {loading && !result && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
            <Loader size="sm" variant="bars" />
            Loading…
          </div>
        )}

        {/* Not yet checked */}
        {!loading && !result && !checking && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
            <AlertTriangle className="w-3.5 h-3.5 text-zinc-300" />
            Not checked yet. Click &ldquo;Check Plagiarism&rdquo; to analyze.
          </div>
        )}

        {/* Running */}
        {checking && (
          <div className="flex items-center gap-2 text-xs text-blue-600 py-1">
            <Loader size="sm" variant="bars" />
            Extracting text and comparing submissions…
          </div>
        )}

        {/* Error */}
        {!checking && result?.status === "ERROR" && (
          <div className="flex items-center gap-2 text-xs text-red-600 py-1">
            <ShieldX className="w-3.5 h-3.5" />
            {result.errorMessage ?? "Analysis failed. Try again."}
          </div>
        )}

        {/* Result */}
        {!checking && result?.status === "DONE" && (
          <div className="space-y-3">
            {/* Score row */}
            <div className="flex items-center gap-3">
              <ScoreRing score={result.similarityScore} status={result.plagiarismStatus} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-zinc-900">
                    {result.similarityScore}% Similar
                  </span>
                  <StatusBadge status={result.plagiarismStatus} />
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {result.matches.length === 0
                    ? "No matching submissions found."
                    : `Matched against ${result.matches.length} other submission${result.matches.length > 1 ? "s" : ""}`}
                </p>
                {result.checkedAt && (
                  <p className="text-[10px] text-zinc-300 mt-0.5">
                    Checked: {new Date(result.checkedAt).toLocaleString("en-IN", {
                      dateStyle: "medium", timeStyle: "short",
                    })}
                  </p>
                )}
              </div>

              {/* Summary icons */}
              {result.plagiarismStatus === "SAFE" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              )}
              {result.plagiarismStatus === "HIGH" && (
                <ShieldX className="w-5 h-5 text-red-500 shrink-0" />
              )}
              {result.plagiarismStatus === "MEDIUM" && (
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
              )}
            </div>

            {/* View Matches toggle */}
            {result.matches.length > 0 && (
              <>
                <button
                  onClick={() => setShowMatches((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  {showMatches ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showMatches ? "Hide" : "View"} Matched Content ({result.matches.length})
                </button>

                {showMatches && (
                  <div className="space-y-2">
                    {result.matches.map((match) => (
                      <MatchCard key={match.submissionId} match={match} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
