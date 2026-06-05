"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Video, 
  Monitor, 
  Mic, 
  MicOff, 
  VideoOff, 
  Play, 
  Pause, 
  Square, 
  Share2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShareWhatYouLearnedProps {
  studentName: string | null;
  studentEmail: string;
  courseTitle: string;
}

export function ShareWhatYouLearned({ studentName, studentEmail, courseTitle }: ShareWhatYouLearnedProps) {
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "paused" | "preview" | "uploading" | "success">("idle");
  
  // Device & Mode Controls
  const [mode, setMode] = useState<"camera" | "screen" | "both">("both");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Streams
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  
  // Elements for compositing
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  // MediaRecorder & Chunks
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop all active streams
  const stopAllStreams = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (webcamVideoRef.current) {
      webcamVideoRef.current.pause();
      if (webcamVideoRef.current.parentNode) {
        webcamVideoRef.current.parentNode.removeChild(webcamVideoRef.current);
      }
      webcamVideoRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.pause();
      if (screenVideoRef.current.parentNode) {
        screenVideoRef.current.parentNode.removeChild(screenVideoRef.current);
      }
      screenVideoRef.current = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((track) => track.stop());
      combinedStreamRef.current = null;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer effect when recording is active (not paused)
  useEffect(() => {
    if (recordingState === "recording") {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [recordingState]);

  const startRecording = async () => {
    setError(null);
    chunksRef.current = [];
    setDuration(0);
    
    try {
      let webcamStream: MediaStream | null = null;
      let screenStream: MediaStream | null = null;

      // 1. Grab Webcam/Audio stream if needed
      if (mode === "camera" || mode === "both" || micEnabled) {
        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: (mode === "camera" || mode === "both") && cameraEnabled
            ? { width: 640, height: 480, frameRate: 30 }
            : false,
          audio: micEnabled
        });
        webcamStreamRef.current = webcamStream;
      }

      // 2. Grab Screen capture if needed
      if (mode === "screen" || mode === "both") {
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 },
            audio: true
          });
          screenStreamRef.current = screenStream;
          
          // Stop if native screen-share banner Stop is clicked
          screenStream.getVideoTracks()[0].addEventListener("ended", () => {
            handleStopRecording();
          });
        } catch (err) {
          if (webcamStream) {
            webcamStream.getTracks().forEach(t => t.stop());
          }
          throw err;
        }
      }

      let finalStream: MediaStream;

      if (mode === "both" && webcamStream && screenStream && cameraEnabled) {
        // Create elements for composting onto canvas
        const webcamVideo = document.createElement("video");
        webcamVideo.srcObject = webcamStream;
        webcamVideo.muted = true;
        webcamVideo.playsInline = true;
        webcamVideo.style.position = "absolute";
        webcamVideo.style.top = "-9999px";
        webcamVideo.style.left = "-9999px";
        webcamVideo.style.width = "1px";
        webcamVideo.style.height = "1px";
        webcamVideo.style.opacity = "0";
        webcamVideo.style.pointerEvents = "none";
        document.body.appendChild(webcamVideo);
        webcamVideo.play().catch((err) => console.error("Webcam video play failed", err));
        webcamVideoRef.current = webcamVideo;

        const screenVideo = document.createElement("video");
        screenVideo.srcObject = screenStream;
        screenVideo.muted = true;
        screenVideo.playsInline = true;
        screenVideo.style.position = "absolute";
        screenVideo.style.top = "-9999px";
        screenVideo.style.left = "-9999px";
        screenVideo.style.width = "1px";
        screenVideo.style.height = "1px";
        screenVideo.style.opacity = "0";
        screenVideo.style.pointerEvents = "none";
        document.body.appendChild(screenVideo);
        screenVideo.play().catch((err) => console.error("Screen video play failed", err));
        screenVideoRef.current = screenVideo;

        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d");

        if (!ctx) throw new Error("Could not construct composting context");

        const drawFrame = () => {
          if (!ctx || !canvasRef.current) return;
          ctx.fillStyle = "#18181b";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw screen content
          if (screenVideo.readyState >= 2) {
            ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          }

          // Draw webcam overlay bottom-right corner
          if (webcamVideo.readyState >= 2) {
            const pipW = 280;
            const pipH = 210;
            const pipX = canvas.width - pipW - 30;
            const pipY = canvas.height - pipH - 30;

            ctx.fillStyle = "#09090b";
            ctx.beginPath();
            ctx.roundRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8, 16);
            ctx.fill();

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(pipX, pipY, pipW, pipH, 12);
            ctx.clip();
            ctx.drawImage(webcamVideo, pipX, pipY, pipW, pipH);
            ctx.restore();
          }
          animationFrameIdRef.current = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        // Audio node mixing
        // @ts-expect-error — webkitAudioContext is a vendor-prefixed fallback not in TS types
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        const dest = audioCtx.createMediaStreamDestination();
        let audioMixed = false;

        if (webcamStream.getAudioTracks().length > 0) {
          const micSource = audioCtx.createMediaStreamSource(new MediaStream([webcamStream.getAudioTracks()[0]]));
          micSource.connect(dest);
          audioMixed = true;
        }

        if (screenStream.getAudioTracks().length > 0) {
          const systemSource = audioCtx.createMediaStreamSource(new MediaStream([screenStream.getAudioTracks()[0]]));
          systemSource.connect(dest);
          audioMixed = true;
        }

        const canvasStream = canvas.captureStream(30);
        const tracks = [...canvasStream.getVideoTracks()];
        if (audioMixed) {
          tracks.push(...dest.stream.getAudioTracks());
        }
        finalStream = new MediaStream(tracks);

      } else if (mode === "camera" && webcamStream && cameraEnabled) {
        finalStream = webcamStream;
      } else if (mode === "screen" && screenStream) {
        // screen share with optional microphone audio from webcam stream
        const tracks = [...screenStream.getVideoTracks()];
        if (webcamStream && webcamStream.getAudioTracks().length > 0) {
          tracks.push(webcamStream.getAudioTracks()[0]);
        }
        finalStream = new MediaStream(tracks);
      } else {
        // Fallback or screen capture with mic
        if (screenStream) {
          const tracks = [...screenStream.getVideoTracks()];
          if (webcamStream && webcamStream.getAudioTracks().length > 0) {
            tracks.push(webcamStream.getAudioTracks()[0]);
          }
          finalStream = new MediaStream(tracks);
        } else if (webcamStream) {
          finalStream = webcamStream;
        } else {
          throw new Error("No inputs selected. Please enable camera or screen sharing.");
        }
      }

      combinedStreamRef.current = finalStream;

      const recorder = new MediaRecorder(finalStream, {
        mimeType: "video/webm;codecs=vp8,opus"
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedVideoUrl(url);
        setRecordingState("preview");
        stopAllStreams();
      };

      recorder.start(100);
      setRecordingState("recording");

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to initialize devices. Check permissions.");
      stopAllStreams();
      setRecordingState("idle");
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingState("paused");
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecorder = () => {
    stopAllStreams();
    setRecordedVideoUrl(null);
    setRecordedBlob(null);
    setCaption("");
    setError(null);
    setRecordingState("idle");
    setDuration(0);
  };

  const uploadRecording = async () => {
    if (!recordedBlob) return;
    setRecordingState("uploading");
    setError(null);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      const videoFile = new File([recordedBlob], "learning-share.webm", { type: "video/webm" });
      formData.append("file", videoFile);
      formData.append("studentName", studentName || "Anonymous Student");
      formData.append("email", studentEmail);
      const finalCaption = caption.trim() 
        ? `${caption.trim()} (Course: ${courseTitle})`
        : `Course: ${courseTitle}`;
      formData.append("caption", finalCaption);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 10;
        });
      }, 250);

      const res = await fetch("/api/shared-videos/upload", {
        method: "POST",
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload.");

      setRecordingState("success");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Upload failed. Please try again.");
      setRecordingState("preview");
    }
  };

  return (
    <section className="rounded-3xl overflow-hidden transition-all duration-300" style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}>

      {/* Header */}
      <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(217,37,42,0.12)", border: "1px solid rgba(217,37,42,0.25)" }}>
            <Video className="w-5 h-5 text-[#D9252A]" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight" style={{ color: "var(--foreground)" }}>Share Your Learning</h3>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted-foreground)" }}>Record your webcam, screen, or both to share with your instructor</p>
          </div>
        </div>

        {/* Live Timer */}
        {(recordingState === "recording" || recordingState === "paused") && (
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${
            recordingState === "recording" 
              ? "animate-pulse" 
              : ""
          }`} style={{
            background: recordingState === "recording" ? "var(--accent)" : "var(--secondary-background)",
            borderColor: recordingState === "recording" ? "var(--accent)" : "var(--border)",
            color: recordingState === "recording" ? "white" : "var(--foreground)",
          }}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-bold font-mono tracking-widest">{formatTime(duration)}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest ml-1">{recordingState}</span>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-6 relative z-10">
        {error && (
          <div className="flex items-start gap-3 p-4 mb-5 text-xs rounded-2xl" style={{ background: "rgba(217,37,42,0.10)", border: "1px solid rgba(217,37,42,0.25)", color: "var(--accent)" }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* STATE: CONFIG / IDLE */}
        {recordingState === "idle" && (
          <div className="space-y-6">
            {/* Options layout grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Select Mode */}
              <div className="rounded-2xl p-4 flex flex-col justify-between" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Recording Mode</Label>
                  <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>Select the capture layout</p>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {(["both", "screen", "camera"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                      style={{
                        background: mode === m ? "rgba(217,37,42,0.15)" : "transparent",
                        borderColor: mode === m ? "#D9252A" : "var(--border)",
                        color: mode === m ? "#D9252A" : "var(--muted-foreground)",
                      }}
                    >
                      <span className="capitalize">{m === "both" ? "Screen + Camera" : m + " Only"}</span>
                      {m === "camera" && <Video className="w-3.5 h-3.5" />}
                      {m === "screen" && <Monitor className="w-3.5 h-3.5" />}
                      {m === "both" && <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera configuration (Only applicable if camera mode/both is chosen) */}
              <div className="rounded-2xl p-4 flex flex-col justify-between transition-all" style={{
                background: "var(--secondary-background)",
                border: "1px solid var(--border)",
                opacity: mode === "screen" ? 0.4 : 1,
              }}>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Webcam Input</Label>
                  <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>Enable or disable camera</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={mode === "screen"}
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={{
                      background: cameraEnabled && mode !== "screen" ? "var(--foreground)" : "transparent",
                      borderColor: cameraEnabled && mode !== "screen" ? "var(--foreground)" : "var(--border)",
                      color: cameraEnabled && mode !== "screen" ? "var(--background)" : "var(--muted-foreground)",
                      opacity: mode === "screen" ? 0.5 : 1,
                    }}
                  >
                    <span>{cameraEnabled && mode !== "screen" ? "Camera Enabled" : "Camera Disabled"}</span>
                    {cameraEnabled && mode !== "screen" ? <Video className="w-4 h-4" style={{ color: "var(--background)" }} /> : <VideoOff className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />}
                  </button>
                </div>
              </div>

              {/* Microphone configuration */}
              <div className="rounded-2xl p-4 flex flex-col justify-between" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Microphone Input</Label>
                  <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>Capture your voice narration</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setMicEnabled(!micEnabled)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={{
                      background: micEnabled ? "var(--foreground)" : "transparent",
                      borderColor: micEnabled ? "var(--foreground)" : "var(--border)",
                      color: micEnabled ? "var(--background)" : "var(--muted-foreground)",
                    }}
                  >
                    <span>{micEnabled ? "Microphone Enabled" : "Microphone Disabled"}</span>
                    {micEnabled ? <Mic className="w-4 h-4" style={{ color: "var(--background)" }} /> : <MicOff className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />}
                  </button>
                </div>
              </div>

            </div>

            {/* Launch Block */}
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
                <Video className="w-7 h-7" style={{ color: "var(--muted-foreground)" }} />
              </div>
              <h4 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Ready to present?</h4>
              <p className="text-xs max-w-sm mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                Click start to begin capturing. You can pause, resume, and preview your recording before submitting it.
              </p>
              <button
                type="button"
                onClick={startRecording}
                className="rounded-xl px-6 h-11 text-xs font-bold tracking-wide mt-6 transition-all hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: "#D9252A", color: "white" }}
              >
                <Play className="w-3.5 h-3.5 inline mr-2" /> Start Recording
              </button>
            </div>
          </div>
        )}

        {/* STATE: RECORDING ACTIVE or PAUSED */}
        {(recordingState === "recording" || recordingState === "paused") && (
          <div className="space-y-6 py-6 text-center flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
                {mode === "camera" ? <Video className="w-8 h-8 text-[#D9252A]" /> : <Monitor className="w-8 h-8 text-[#D9252A]" />}
              </div>
              {micEnabled && (
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center" style={{ background: "#10B981", borderColor: "var(--card)" }}>
                  <Mic className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                {recordingState === "recording" ? "Recording active" : "Recording paused"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Capturing layout: <span className="capitalize font-semibold" style={{ color: "var(--foreground)" }}>{mode}</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 mt-4">
              {recordingState === "recording" ? (
                <button
                  type="button"
                  onClick={handlePauseRecording}
                  className="rounded-xl px-5 h-10 text-xs font-bold border transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "transparent" }}
                >
                  <Pause className="w-3.5 h-3.5 inline mr-2" /> Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResumeRecording}
                  className="rounded-xl px-5 h-10 text-xs font-bold"
                  style={{ background: "#10B981", color: "white" }}
                >
                  <Play className="w-3.5 h-3.5 inline mr-2" /> Resume
                </button>
              )}

              <button
                type="button"
                onClick={handleStopRecording}
                className="rounded-xl px-5 h-10 text-xs font-bold"
                style={{ background: "#D9252A", color: "white" }}
              >
                <Square className="w-3.5 h-3.5 inline mr-2" /> Stop & Preview
              </button>
            </div>
          </div>
        )}

        {/* STATE: PREVIEW */}
        {recordingState === "preview" && recordedVideoUrl && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
              <video 
                src={recordedVideoUrl} 
                controls 
                className="w-full h-full object-contain"
                playsInline
              />
            </div>

            <div className="space-y-1.5 p-3 rounded-xl" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
              <Label htmlFor="video-caption" className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                <MessageSquare className="w-3.5 h-3.5 text-[#D9252A]" />
                Add a caption or comment
              </Label>
              <Input
                id="video-caption"
                placeholder="Write a short note about what you are sharing (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                className="text-xs h-9 rounded-lg focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={resetRecorder}
                className="rounded-xl text-xs h-11 font-bold border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "transparent" }}
              >
                <RefreshCw className="w-3.5 h-3.5 inline mr-2" /> Record Again
              </button>
              
              <button
                type="button"
                onClick={uploadRecording}
                className="rounded-xl text-xs h-11 font-bold transition-all hover:scale-[1.02]"
                style={{ background: "#D9252A", color: "white" }}
              >
                <Share2 className="w-3.5 h-3.5 inline mr-2" /> Submit Video
              </button>
            </div>
          </div>
        )}

        {/* STATE: UPLOADING */}
        {recordingState === "uploading" && (
          <div className="text-center py-8 space-y-4">
            <RingLoader size="lg" />
            
            <div className="space-y-1">
              <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Saving learning video...</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Writing video metadata and uploading storage packet</p>
            </div>

            <div className="w-full max-w-[240px]">
              <p className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>{uploadProgress}% uploaded</p>
            </div>
          </div>
        )}

        {/* STATE: SUCCESS */}
        {recordingState === "success" && (
          <div className="text-center py-8 space-y-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(217,37,42,0.12)", border: "1px solid rgba(217,37,42,0.25)", color: "#D9252A" }}>
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-black" style={{ color: "var(--foreground)" }}>Video Shared Successfully!</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Your presentation has been shared with your course instructor</p>
            </div>

            <button
              type="button"
              onClick={resetRecorder}
              className="rounded-xl px-6 h-11 text-xs font-bold tracking-wide mt-4"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              Record Another Video
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
