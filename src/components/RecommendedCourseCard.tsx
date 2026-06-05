"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  GraduationCap,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  BookMarked,
} from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";

// ── Types matching the API response ──────────────────────────────────────────
interface RecommendedCourse {
  id: string;
  title: string;
  description: string | null;
  enrollmentCount: number;
  reason: string;
}

interface RecommendationsResponse {
  recommendedNext: RecommendedCourse | null;
  nearlyComplete: { id: string; title: string; progress: number } | null;
  lowScoreCourse: { id: string; title: string; avgScore: number } | null;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RecommendedCourseCard() {
  const router = useRouter();
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<RecommendationsResponse>;
      })
      .then((d) => setData(d))
      .catch(() => setError("Could not load recommendations."))
      .finally(() => setLoading(false));
  }, []);

  const handleEnroll = async (courseId: string) => {
    setEnrolling(true);
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (res.ok) {
        setEnrolled(true);
        router.refresh();
      }
    } catch {
      /* silent */
    } finally {
      setEnrolling(false);
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
        <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }} className="overflow-hidden">
          <CardHeader className="pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
            <Sparkles className="w-4 h-4 text-[#D9252A]" />
            Recommended For You
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-8 w-24 mt-2" />
        </CardContent>
      </Card>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
        <CardHeader className="pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
            <Sparkles className="w-4 h-4 text-[#D9252A]" />
            Recommended For You
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          {error}
        </CardContent>
      </Card>
    );
  }

  const { recommendedNext, nearlyComplete, lowScoreCourse } = data ?? {};
  const hasAnything = recommendedNext || nearlyComplete || lowScoreCourse;

  // ── Empty state – all courses enrolled ──
  if (!hasAnything) {
    return (
      <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
        <CardHeader className="pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
            <Sparkles className="w-4 h-4 text-[#D9252A]" />
            Recommended For You
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          All courses covered!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }} className="overflow-hidden">
      <CardHeader className="pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
          <Sparkles className="w-4 h-4 text-[#D9252A]" />
          Recommended For You
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0" style={{ borderTop: "none" }}>

        {/* ── Nearly Complete hint ── */}
        {nearlyComplete && (
          <div className="p-4 flex items-start gap-3" style={{ background: "rgba(217,37,42,0.04)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(217,37,42,0.08)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "#D9252A" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-tight" style={{ color: "#D9252A" }}>
                Almost There!
              </p>
              <p className="text-sm font-semibold truncate mt-0.5" style={{ color: "var(--foreground)" }}>
                {nearlyComplete.title}
              </p>
              <Link href={`/student/courses/${nearlyComplete.id}`}>
                <Button
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  style={{ background: "var(--foreground)", color: "var(--background)" }}
                >
                  Continue <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Low quiz score warning ── */}
        {lowScoreCourse && (
          <div className="p-4 flex items-start gap-3" style={{ background: "var(--secondary-background)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--muted)" }}>
              <AlertTriangle className="w-4 h-4" style={{ color: "var(--foreground)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-tight" style={{ color: "var(--foreground)" }}>
                Needs Revision
              </p>
              <p className="text-sm font-semibold truncate mt-0.5" style={{ color: "var(--foreground)" }}>
                {lowScoreCourse.title}
              </p>
              <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                Avg quiz score: {lowScoreCourse.avgScore}%
              </p>
              <Link href={`/student/courses/${lowScoreCourse.id}?tab=quizzes`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  Review Course <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Recommended next course ── */}
        {recommendedNext && !enrolled && (
          <div className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(217,37,42,0.08)" }}>
              <GraduationCap className="w-4 h-4" style={{ color: "#D9252A" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-tight" style={{ color: "#D9252A" }}>
                Next Course
              </p>
              <p className="text-sm font-semibold truncate mt-0.5" style={{ color: "var(--foreground)" }}>
                {recommendedNext.title}
              </p>
              {recommendedNext.description && (
                <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                  {recommendedNext.description}
                </p>
              )}
              <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "#D9252A" }}>
                <BookMarked className="w-3 h-3" />
                {recommendedNext.reason}
              </p>
              <Button
                size="sm"
                onClick={() => handleEnroll(recommendedNext.id)}
                disabled={enrolling}
                className="mt-2 h-7 text-xs"
                style={{ background: "var(--foreground)", color: "var(--background)" }}
              >
                {enrolling ? (
                  <>
                    <RingLoader size="sm" className="inline-flex mr-1" /> Enrolling…
                  </>
                ) : (
                  <>
                    Enroll Now <ArrowRight className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Enrolled confirmation */}
        {recommendedNext && enrolled && (
          <div className="p-4 text-center text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            Enrolled!{" "}
            <Link
              href={`/student/courses/${recommendedNext.id}`}
              className="underline"
              style={{ color: "#D9252A" }}
            >
              Go to course
            </Link>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
