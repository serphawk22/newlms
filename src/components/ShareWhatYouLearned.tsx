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
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  MessageSquare
} from "lucide-react";
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
    <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 relative group transition-all duration-300 hover:shadow-zinc-900/50">
      
      {/* Mic glow layout */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-800/70 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-white">Share Your Learning</h3>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">Record your webcam, screen, or both to share with your instructor</p>
          </div>
        </div>

        {/* Live Timer */}
        {(recordingState === "recording" || recordingState === "paused") && (
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${
            recordingState === "recording" 
              ? "bg-red-950/80 border-red-500/30 text-red-400 animate-pulse" 
              : "bg-amber-950/80 border-amber-500/30 text-amber-400"
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-bold font-mono tracking-widest">{formatTime(duration)}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest ml-1">{recordingState}</span>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-6 relative z-10">
        {error && (
          <div className="flex items-start gap-3 p-4 mb-5 text-xs bg-red-950/40 border border-red-900/50 rounded-2xl text-red-300 shadow-inner">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* STATE: CONFIG / IDLE */}
        {recordingState === "idle" && (
          <div className="space-y-6">
            {/* Options layout grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Select Mode */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recording Mode</Label>
                  <p className="text-[11px] text-zinc-500 mt-1">Select the capture layout</p>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {(["both", "screen", "camera"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        mode === m 
                          ? "bg-violet-600/15 border-violet-500 text-violet-300" 
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
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
              <div className={`bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between transition-all ${
                mode === "screen" ? "opacity-40" : ""
              }`}>
                <div>
                  <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Webcam Input</Label>
                  <p className="text-[11px] text-zinc-500 mt-1">Enable or disable camera</p>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    disabled={mode === "screen"}
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    variant="outline"
                    className={`w-full justify-between px-3 rounded-xl text-xs font-bold ${
                      cameraEnabled && mode !== "screen"
                        ? "bg-zinc-800 border-zinc-700 text-white"
                        : "border-zinc-800 text-zinc-500 hover:bg-transparent"
                    }`}
                  >
                    <span>{cameraEnabled && mode !== "screen" ? "Camera Enabled" : "Camera Disabled"}</span>
                    {cameraEnabled && mode !== "screen" ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-zinc-500" />}
                  </Button>
                </div>
              </div>

              {/* Microphone configuration */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Microphone Input</Label>
                  <p className="text-[11px] text-zinc-500 mt-1">Capture your voice narration</p>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={() => setMicEnabled(!micEnabled)}
                    variant="outline"
                    className={`w-full justify-between px-3 rounded-xl text-xs font-bold ${
                      micEnabled 
                        ? "bg-zinc-800 border-zinc-700 text-white" 
                        : "border-zinc-800 text-zinc-500 hover:bg-transparent"
                    }`}
                  >
                    <span>{micEnabled ? "Microphone Enabled" : "Microphone Disabled"}</span>
                    {micEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-zinc-500" />}
                  </Button>
                </div>
              </div>

            </div>

            {/* Launch Block */}
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-zinc-800/50 border border-zinc-700/80 flex items-center justify-center mb-4 shadow-inner">
                <Video className="w-7 h-7 text-zinc-400" />
              </div>
              <h4 className="text-sm font-bold text-zinc-200">Ready to present?</h4>
              <p className="text-xs text-zinc-400 max-w-sm mt-1 leading-relaxed">
                Click start to begin capturing. You can pause, resume, and preview your recording before submitting it.
              </p>
              <Button
                type="button"
                onClick={startRecording}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 h-11 text-xs font-bold tracking-wide mt-6 transition-all hover:scale-[1.03] shadow-md shadow-violet-950/50"
              >
                <Play className="w-3.5 h-3.5 mr-2" /> Start Recording
              </Button>
            </div>
          </div>
        )}

        {/* STATE: RECORDING ACTIVE or PAUSED */}
        {(recordingState === "recording" || recordingState === "paused") && (
          <div className="space-y-6 py-6 text-center flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center animate-pulse">
                {mode === "camera" ? <Video className="w-8 h-8 text-violet-400" /> : <Monitor className="w-8 h-8 text-violet-400" />}
              </div>
              {micEnabled && (
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                  <Mic className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-white">
                {recordingState === "recording" ? "Recording active" : "Recording paused"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Capturing layout: <span className="capitalize text-zinc-200 font-semibold">{mode}</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 mt-4">
              {recordingState === "recording" ? (
                <Button
                  type="button"
                  onClick={handlePauseRecording}
                  variant="outline"
                  className="border-zinc-800 hover:bg-zinc-800/80 text-zinc-300 rounded-xl px-5 h-10 text-xs font-bold"
                >
                  <Pause className="w-3.5 h-3.5 mr-2" /> Pause
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleResumeRecording}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 h-10 text-xs font-bold"
                >
                  <Play className="w-3.5 h-3.5 mr-2" /> Resume
                </Button>
              )}

              <Button
                type="button"
                onClick={handleStopRecording}
                className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-5 h-10 text-xs font-bold shadow-md shadow-red-950/20"
              >
                <Square className="w-3.5 h-3.5 mr-2" /> Stop & Preview
              </Button>
            </div>
          </div>
        )}

        {/* STATE: PREVIEW */}
        {recordingState === "preview" && recordedVideoUrl && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 aspect-video shadow-inner flex items-center justify-center">
              <video 
                src={recordedVideoUrl} 
                controls 
                className="w-full h-full object-contain"
                playsInline
              />
            </div>

            <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60">
              <Label htmlFor="video-caption" className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                Add Caption / Notes
              </Label>
              <Input
                id="video-caption"
                placeholder="Write a short note about what you are sharing (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs text-white placeholder-zinc-500 h-10 rounded-xl focus-visible:ring-violet-600 focus-visible:border-violet-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                onClick={resetRecorder}
                variant="outline"
                className="border-zinc-800 hover:bg-zinc-850 text-zinc-300 rounded-xl text-xs h-11 font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Record Again
              </Button>
              
              <Button
                type="button"
                onClick={uploadRecording}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs h-11 font-bold shadow-md shadow-violet-950/40"
              >
                <Share2 className="w-3.5 h-3.5 mr-2" /> Submit Video
              </Button>
            </div>
          </div>
        )}

        {/* STATE: UPLOADING */}
        {recordingState === "uploading" && (
          <div className="text-center py-8 space-y-4 flex flex-col items-center justify-center">
            <div className="relative inline-flex">
              <div className="w-14 h-14 rounded-full border-4 border-zinc-800 border-t-violet-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-violet-400 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Saving learning video...</p>
              <p className="text-xs text-zinc-500">Writing video metadata and uploading storage packet</p>
            </div>

            <div className="w-full max-w-[240px] space-y-1">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-zinc-500">{uploadProgress}%</p>
            </div>
          </div>
        )}

        {/* STATE: SUCCESS */}
        {recordingState === "success" && (
          <div className="text-center py-8 space-y-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-black text-white">Video Shared Successfully!</p>
              <p className="text-xs text-zinc-400">Your presentation has been shared with your course instructor</p>
            </div>

            <Button
              type="button"
              onClick={resetRecorder}
              className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl px-6 h-11 text-xs font-bold tracking-wide mt-4"
            >
              Record Another Video
            </Button>
          </div>
        )}

      </div>
    </section>
  );
}
