"use client";

import { useEffect, useRef, useState } from "react";
import { X, MonitorPlay, Clock, Maximize2 } from "lucide-react";

interface VideoPlayerModalProps {
  /** Video URL (Cloudinary / any direct .webm / .mp4) */
  videoUrl: string;
  title: string;
  duration?: number | null;
  /** Trigger element — rendered as-is; clicking it opens the modal */
  children: React.ReactNode;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VideoPlayerModal({ videoUrl, title, duration, children }: VideoPlayerModalProps) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Pause & reset when modal closes
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) setOpen(false);
  };

  return (
    <>
      {/* Trigger — wrap whatever the parent passes */}
      <span onClick={() => setOpen(true)} className="contents cursor-pointer">
        {children}
      </span>

      {/* Modal */}
      {open && (
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Playing: ${title}`}
        >
          <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ background: "var(--secondary-background)", borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <MonitorPlay className="w-4 h-4 text-[#D9252A] shrink-0" />
                <span className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{title}</span>
                {duration && (
                  <span className="text-xs flex items-center gap-1 shrink-0" style={{ color: "var(--muted-foreground)" }}>
                    <Clock className="w-3 h-3" /> {formatDuration(duration)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {/* Full-screen hint */}
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in new tab (full screen)"
                  className="transition-colors p-1"
                  style={{ color: "var(--muted-foreground)" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--foreground)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--muted-foreground)"}
                >
                  <Maximize2 className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setOpen(false)}
                  id="video-modal-close-btn"
                  aria-label="Close video player"
                  className="transition-colors p-1"
                  style={{ color: "var(--muted-foreground)" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--foreground)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--muted-foreground)"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video */}
            <div className="relative bg-black aspect-video w-full">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                preload="auto"
                className="w-full h-full object-contain"
                id="video-modal-player"
              />
            </div>

          </div>
        </div>
      )}
    </>
  );
}
