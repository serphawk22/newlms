"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Pause, RefreshCw } from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";

interface Recording {
  id: string;
  title: string;
  videoUrl: string;
  duration: number | null;
  createdAt: string;
  instructor: { name: string | null };
}

interface Props {
  courseId: string;
  isInstructor: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ── Individual video card ─────────────────────────────────────────────────────
function RecordingCard({ rec }: { rec: Recording }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play();
      setPlaying(true);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all group"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      id={`recording-card-${rec.id}`}
    >
      {/* Video player */}
      <div className="relative bg-slate-950 aspect-video w-full overflow-hidden">
        <video
          ref={videoRef}
          src={rec.videoUrl}
          className="w-full h-full object-contain"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          controls
          preload="metadata"
        />
        {/* Play/Pause overlay — only shown when controls are hidden */}
        {!playing && (
          <button
            onClick={toggle}
            id={`play-btn-${rec.id}`}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/60 hover:bg-white/30 transition-colors">
              <Play className="w-7 h-7 text-white ml-1" />
            </div>
          </button>
        )}
        {playing && (
          <button
            onClick={toggle}
            id={`pause-btn-${rec.id}`}
            className="absolute top-2 right-2 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-colors z-10"
          >
            <Pause className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="p-5">
        <h3 className="font-bold text-lg leading-snug line-clamp-2" style={{ color: "var(--foreground)" }}>
          {rec.title}
        </h3>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <span className="text-xs">{formatDate(rec.createdAt)}</span>
          {rec.duration && (
            <span className="text-xs">{formatDuration(rec.duration)}</span>
          )}
          {rec.instructor.name && (
            <span className="text-xs">{rec.instructor.name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main tab component ────────────────────────────────────────────────────────
export function RecordedClassesTab({ courseId, isInstructor }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecordings = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/recordings?courseId=${courseId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecordings(data.recordings ?? []);
    } catch (e) {
      setError("Failed to load recordings. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return (
    <div className="space-y-6" id="recorded-classes-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Recorded Classes</h3>
        <button
          onClick={() => fetchRecordings(true)}
          disabled={refreshing}
          id="refresh-recordings-btn"
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isInstructor && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(217,37,42,0.08)", border: "1px solid rgba(217,37,42,0.25)", color: "#D9252A" }}>
          <strong>Auto-recording enabled:</strong> When you stop a recording during a live class,
          it uploads automatically to Cloudinary and appears here.
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: "var(--muted-foreground)" }}>
          <RingLoader size="md" />
          <span>Loading recordings…</span>
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-16 rounded-xl text-sm" style={{ background: "rgba(217,37,42,0.08)", border: "1px solid rgba(217,37,42,0.25)", color: "#D9252A" }}>
          {error}
          <button
            onClick={() => fetchRecordings()}
            className="block mx-auto mt-3 underline"
            style={{ color: "#D9252A" }}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && recordings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>No recorded classes yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              {isInstructor
                ? "Start a live class and use the Record button — recordings appear here automatically."
                : "Check back after your instructor records a live session."}
            </p>
          </div>
        </div>
      )}

      {!loading && !error && recordings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {recordings.map((rec) => (
            <RecordingCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
