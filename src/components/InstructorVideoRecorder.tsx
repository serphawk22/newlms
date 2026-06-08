"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  StopCircle,
  Pause,
  Play,
  RotateCcw,
  Save,
  X,
  Circle,
  Loader2,
  Minimize2,
  Maximize2,
  ExternalLink,
} from "lucide-react";

type RecorderState = "idle" | "setup" | "recording" | "paused" | "preview" | "saving";

interface Props {
  courseId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  onSaved: () => void;
}

export function InstructorVideoRecorder({
  courseId,
  moduleId,
  lessonId,
  lessonTitle,
  onClose,
  onSaved,
}: Props) {
  const [state, setState] = useState<RecorderState>("setup");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [title, setTitle] = useState(`${lessonTitle} – Recording`);

  // Active Streams
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);

  // Hidden DOM Video Elements (Always rendered to ensure standard stream playback)
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Visible UI Video Elements
  const mainVideoRef = useRef<HTMLVideoElement>(null);   // Live screen or camera preview
  const pipVideoRef = useRef<HTMLVideoElement>(null);    // Live PiP camera overlay
  const previewVideoRef = useRef<HTMLVideoElement>(null);// Recorded preview player

  // Canvas Compositing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Recorder & timer
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopEverything();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopEverything = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    canvasStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    canvasStreamRef.current = null;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── Canvas compositing loop ───────────────────────────────────────────────
  // Draws screen (full canvas) + camera PiP (top-left corner to match screenshot 2)
  const startCompositing = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const screenEl = screenVideoRef.current;
      const cameraEl = cameraVideoRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background (Screen share or Camera full)
      if (screenOn && screenEl && screenEl.readyState >= 2) {
        ctx.drawImage(screenEl, 0, 0, canvas.width, canvas.height);
      } else if (cameraEl && cameraEl.readyState >= 2) {
        ctx.drawImage(cameraEl, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw camera PiP in top-left corner if native PiP is NOT active (preventing duplicate FaceTime videos)
      if (screenOn && cameraEl && cameraEl.readyState >= 2 && cameraOn && !document.pictureInPictureElement) {
        const pipW = Math.round(canvas.width * 0.22);
        const pipH = Math.round(pipW * (9 / 16));
        const pipX = 18;
        const pipY = 18;
        const r = 12;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pipX + r, pipY);
        ctx.lineTo(pipX + pipW - r, pipY);
        ctx.quadraticCurveTo(pipX + pipW, pipY, pipX + pipW, pipY + r);
        ctx.lineTo(pipX + pipW, pipY + pipH - r);
        ctx.quadraticCurveTo(pipX + pipW, pipY + pipH, pipX + pipW - r, pipY + pipH);
        ctx.lineTo(pipX + r, pipY + pipH);
        ctx.quadraticCurveTo(pipX, pipY + pipH, pipX, pipY + pipH - r);
        ctx.lineTo(pipX, pipY + r);
        ctx.quadraticCurveTo(pipX, pipY, pipX + r, pipY);
        ctx.closePath();
        ctx.clip();

        // Mirror camera stream in compositing canvas
        ctx.translate(pipX + pipW / 2, pipY + pipH / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(cameraEl, -pipW / 2, -pipH / 2, pipW, pipH);
        ctx.restore();

        // PiP border
        ctx.save();
        ctx.strokeStyle = "rgba(217,37,42,0.8)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(pipX, pipY, pipW, pipH, r);
        } else {
          ctx.rect(pipX, pipY, pipW, pipH);
        }
        ctx.stroke();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
  }, [cameraOn, screenOn]);

  // ── Acquire camera stream ─────────────────────────────────────────────────
  const getCameraStream = async (withVideo: boolean, withAudio: boolean): Promise<MediaStream | null> => {
    if (!withVideo && !withAudio) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: withVideo ? { width: 1280, height: 720, facingMode: "user" } : false,
        audio: withAudio,
      });
      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play().catch(() => {});
      }

      return stream;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot access camera/mic");
      return null;
    }
  };

  // ── Acquire screen stream ─────────────────────────────────────────────────
  const getScreenStream = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 } as MediaTrackConstraints,
        audio: false,
      });
      screenStreamRef.current = stream;

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        screenVideoRef.current.play().catch(() => {});
      }

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setScreenOn(false);
        screenStreamRef.current = null;
        if (mainVideoRef.current && cameraStreamRef.current) {
          mainVideoRef.current.srcObject = cameraStreamRef.current;
        }
      });

      return stream;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot access screen");
      return null;
    }
  };

  // ── Build live preview after acquiring streams ─────────────────────────────
  const buildLivePreview = (camStream: MediaStream | null, scrStream: MediaStream | null) => {
    if (scrStream && mainVideoRef.current) {
      mainVideoRef.current.srcObject = scrStream;
      if (camStream && pipVideoRef.current) {
        pipVideoRef.current.srcObject = camStream;
      }
    } else if (camStream && mainVideoRef.current) {
      mainVideoRef.current.srcObject = camStream;
    }
  };

  // Initialize setup preview
  useEffect(() => {
    (async () => {
      const cam = await getCameraStream(cameraOn, micOn);
      buildLivePreview(cam, null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCamera = async () => {
    const next = !cameraOn;
    setCameraOn(next);
    if (state === "setup") {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      const cam = await getCameraStream(next, micOn);
      buildLivePreview(cam, screenStreamRef.current);
    } else {
      cameraStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
    }
  };

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    cameraStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
  };

  // ── Native PiP (Picture in Picture) FaceTime Floating Window ──────────────
  const toggleFloatCamera = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (pipVideoRef.current) {
        await pipVideoRef.current.requestPictureInPicture();
      } else if (cameraVideoRef.current) {
        await cameraVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("Picture-in-Picture is not supported or was blocked:", err);
    }
  };

  // ── Toggle screen share ───────────────────────────────────────────────────
  const toggleScreen = async () => {
    const next = !screenOn;
    setScreenOn(next);
    if (next) {
      const scr = await getScreenStream();
      if (!scr) { setScreenOn(false); return; }
      buildLivePreview(cameraStreamRef.current, scr);
      // Automatically float FaceTime feed when sharing screen
      setTimeout(() => {
        toggleFloatCamera();
      }, 500);
    } else {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      buildLivePreview(cameraStreamRef.current, null);
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    }
  };

  // ── Start Recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null);

    if (cameraOn && !cameraStreamRef.current) {
      await getCameraStream(true, micOn);
    }
    if (screenOn && !screenStreamRef.current) {
      await getScreenStream();
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    canvasRef.current = canvas;
    startCompositing(canvas);

    const canvasStream = canvas.captureStream(30);
    canvasStreamRef.current = canvasStream;

    const audioTracks = cameraStreamRef.current?.getAudioTracks() ?? [];
    const recordStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    chunksRef.current = [];
    const mr = new MediaRecorder(recordStream, { mimeType });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setState("preview");
    };

    mr.start(500);
    setState("recording");
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  };

  const togglePause = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (state === "recording") {
      mr.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState("paused");
    } else {
      mr.resume();
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
      setState("recording");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  };

  const recordAgain = async () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordedBlob(null);
    setElapsedSeconds(0);
    setSaveError(null);
    setScreenOn(false);
    screenStreamRef.current = null;
    setState("setup");
    const cam = await getCameraStream(cameraOn, micOn);
    buildLivePreview(cam, null);
  };

  const saveRecording = async () => {
    if (!recordedBlob || !title.trim()) return;
    
    // Always trigger local download to the user's PC first
    try {
      const extension = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `${sanitizedTitle}.${extension}`;
      
      const a = document.createElement("a");
      a.href = previewUrl || URL.createObjectURL(recordedBlob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Local download failed:", err);
    }

    setState("saving");
    setSaveError(null);
    try {
      const formData = new FormData();
      formData.append("file", recordedBlob, "recording.webm");
      formData.append("courseId", courseId);
      formData.append("moduleId", moduleId);
      formData.append("lessonId", lessonId);
      formData.append("title", title.trim());
      formData.append("duration", String(elapsedSeconds));

      const res = await fetch("/api/instructor/record-video", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
      setState("preview");
    }
  };

  const isRecordingOrPaused = state === "recording" || state === "paused";
  const showPiP = screenOn && cameraOn && state !== "preview" && state !== "saving";

  return (
    <>
      {/* Off-screen active video players to force standard rendering stream decoding without browser sleep/throttling */}
      <div style={{ position: "fixed", bottom: -100, right: -100, width: 20, height: 20, opacity: 0.01, pointerEvents: "none", overflow: "hidden", zIndex: -1 }}>
        <video ref={cameraVideoRef} autoPlay playsInline muted />
        <video ref={screenVideoRef} autoPlay playsInline muted />
      </div>

      {/* Main Container */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-in-out ${
          minimized
            ? "bottom-6 right-6 w-[320px] shadow-2xl rounded-2xl overflow-hidden border-2 border-[#D9252A]"
            : "inset-0 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[6px]"
        }`}
      >
        <div
          className={`w-full overflow-hidden flex flex-col bg-[var(--card)] transition-all duration-300 ${
            minimized
              ? "rounded-none"
              : "max-w-3xl rounded-2xl border border-[var(--border)] shadow-2xl max-h-[95vh]"
          }`}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              borderBottom: "1px solid var(--border)",
              background: "var(--secondary-background)",
            }}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(217,37,42,0.12)", border: "1px solid rgba(217,37,42,0.25)" }}
              >
                <Video className="w-3 h-3 animate-pulse" style={{ color: "#D9252A" }} />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold leading-tight truncate" style={{ color: "var(--foreground)" }}>
                  {minimized ? "Recording Screen" : "Record Video"}
                </p>
                {!minimized && (
                  <p className="text-[10px] leading-tight truncate" style={{ color: "var(--muted-foreground)" }}>
                    {lessonTitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Floating Camera Button (Native PiP) */}
              {cameraOn && (state === "setup" || isRecordingOrPaused) && (
                <button
                  onClick={toggleFloatCamera}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--muted)] transition"
                  title="Float camera window over other programs (e.g. PowerPoint)"
                >
                  <ExternalLink className="w-3 h-3" />
                  {!minimized && "Float Camera"}
                </button>
              )}

              {/* Timer */}
              {isRecordingOrPaused && (
                <div className="flex items-center gap-1.5 mr-1">
                  <div
                    className={`w-2 h-2 rounded-full ${state === "recording" ? "animate-pulse" : ""}`}
                    style={{ background: state === "recording" ? "#D9252A" : "#f59e0b" }}
                  />
                  <span className="text-xs font-mono font-bold" style={{ color: state === "recording" ? "#D9252A" : "var(--foreground)" }}>
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
              )}

              {/* Minimize/Maximize button */}
              {minimized ? (
                <button
                  onClick={() => setMinimized(false)}
                  className="p-1 rounded-full hover:bg-[rgba(0,0,0,0.08)] transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                  title="Maximise"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setMinimized(true)}
                  className="p-1 rounded-full hover:bg-[rgba(217,37,42,0.08)] transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                  title="Minimise"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-[rgba(217,37,42,0.08)] transition-colors"
                style={{ color: "var(--muted-foreground)" }}
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Video / Preview Area */}
          <div className="relative bg-black aspect-[16/9] w-full" style={{ minHeight: 0 }}>
            {/* Live Camera/Screen Preview */}
            {state !== "preview" && state !== "saving" && (
              <video
                ref={mainVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            )}

            {/* PiP FaceTime Video (overlayed on top-left corner matching recorded composited video) */}
            {showPiP && (
              <div
                className="absolute top-3 left-3 rounded-xl overflow-hidden shadow-lg border-2 border-red-500"
                style={{
                  width: "22%",
                  aspectRatio: "16/9",
                  zIndex: 10,
                }}
              >
                <video
                  ref={pipVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div
                  className="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                >
                  You
                </div>
              </div>
            )}

            {/* Recorded Preview Video */}
            {(state === "preview" || state === "saving") && previewUrl && (
              <video
                ref={previewVideoRef}
                src={previewUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}

            {/* Placeholder when Camera is off */}
            {state === "setup" && !cameraOn && !screenOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/40">
                <VideoOff className="w-9 h-9" />
                <p className="text-xs">Camera is off</p>
              </div>
            )}

            {/* Status indicators */}
            {state === "paused" && (
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/70 text-[#f59e0b]">
                ⏸ Paused
              </div>
            )}

            {/* Uploading Status Overlay */}
            {state === "saving" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-sm z-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#D9252A]" />
                <p className="text-white text-xs font-semibold">Saving recording...</p>
              </div>
            )}
          </div>

          {/* Controls Footer */}
          <div
            className={`px-4 py-3 space-y-3 shrink-0 bg-[var(--secondary-background)]`}
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {/* Title Input on Preview (only show in full mode for styling space) */}
            {state === "preview" && !minimized && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Recording Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
                  placeholder="Recording title..."
                />
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Device Toggles (Setup State) */}
              {!isRecordingOrPaused && state !== "preview" && state !== "saving" && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleCamera}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                      cameraOn
                        ? "bg-[rgba(217,37,42,0.12)] text-[#D9252A] border-[rgba(217,37,42,0.3)]"
                        : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]"
                    }`}
                  >
                    {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                    {!minimized && "Camera"}
                  </button>

                  <button
                    onClick={toggleMic}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                      micOn
                        ? "bg-[rgba(217,37,42,0.12)] text-[#D9252A] border-[rgba(217,37,42,0.3)]"
                        : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]"
                    }`}
                  >
                    {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    {!minimized && "Mic"}
                  </button>

                  <button
                    onClick={toggleScreen}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                      screenOn
                        ? "bg-[rgba(217,37,42,0.12)] text-[#D9252A] border-[rgba(217,37,42,0.3)]"
                        : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    {!minimized && (screenOn ? "Sharing Screen" : "Share Screen")}
                  </button>
                </div>
              )}

              {/* Device Toggles during recording */}
              {isRecordingOrPaused && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleMic}
                    className={`p-1.5 rounded-lg border transition-all ${
                      micOn
                        ? "bg-[rgba(217,37,42,0.12)] text-[#D9252A] border-[rgba(217,37,42,0.3)]"
                        : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]"
                    }`}
                  >
                    {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={toggleCamera}
                    className={`p-1.5 rounded-lg border transition-all ${
                      cameraOn
                        ? "bg-[rgba(217,37,42,0.12)] text-[#D9252A] border-[rgba(217,37,42,0.3)]"
                        : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]"
                    }`}
                  >
                    {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 ml-auto">
                {state === "setup" && (
                  <button
                    onClick={startRecording}
                    id="start-recording-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:opacity-90 bg-[#D9252A] text-white"
                  >
                    <Circle className="w-2.5 h-2.5 fill-white" />
                    Start
                  </button>
                )}

                {isRecordingOrPaused && (
                  <>
                    <button
                      onClick={togglePause}
                      id="pause-recording-btn"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                    >
                      {state === "paused" ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      {!minimized && (state === "paused" ? "Resume" : "Pause")}
                    </button>

                    <button
                      onClick={stopRecording}
                      id="stop-recording-btn"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 bg-[#D9252A] text-white"
                    >
                      <StopCircle className="w-3 h-3" />
                      Stop
                    </button>
                  </>
                )}

                {state === "preview" && (
                  <>
                    <button
                      onClick={recordAgain}
                      id="record-again-btn"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {!minimized && "Again"}
                    </button>

                    <button
                      onClick={saveRecording}
                      id="save-recording-btn"
                      disabled={!title.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50 bg-[#D9252A] text-white"
                    >
                      <Save className="w-3 h-3" />
                      {minimized ? "Save" : "Save Recording"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Error notifications */}
            {(error || saveError) && (
              <div className="text-[10px] text-[#D9252A]">
                ⚠ {error || saveError}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
