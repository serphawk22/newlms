"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Video, 
  Monitor, 
  Mic, 
  Play, 
  Square, 
  Share2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
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
}

export function ShareWhatYouLearned({ studentName, studentEmail }: ShareWhatYouLearnedProps) {
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "preview" | "uploading" | "success">("idle");
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

  // ── Stop all media streams ─────────────────────────────────────────────────
  // Declared BEFORE the useEffect that uses it — arrow functions are not hoisted
  const stopAllStreams = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
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

  // Format Duration
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setError(null);
    chunksRef.current = [];
    setDuration(0);
    
    try {
      // 1. Get Webcam + Mic
      const webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 30 },
        audio: true
      });
      webcamStreamRef.current = webcamStream;

      // Create hidden video element for webcam to draw onto canvas
      const webcamVideo = document.createElement("video");
      webcamVideo.srcObject = webcamStream;
      webcamVideo.muted = true;
      webcamVideo.playsInline = true;
      webcamVideo.play();
      webcamVideoRef.current = webcamVideo;

      // 2. Get Screen sharing
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true // try to capture system audio if chosen
      });
      screenStreamRef.current = screenStream;

      // Auto stop if user clicks browser's native "Stop Sharing"
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        handleStopRecording();
      });

      // Create hidden video element for screen sharing
      const screenVideo = document.createElement("video");
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      screenVideo.play();
      screenVideoRef.current = screenVideo;

      // 3. Create Canvas compositor
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to create canvas compositing context.");
      }

      // 4. Render loop
      const drawFrame = () => {
        if (!ctx || !canvasRef.current) return;
        
        ctx.fillStyle = "#18181b"; // Dark zinc bg
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Screen background
        if (screenVideo.readyState >= 2) {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        }

        // Draw Webcam PIP overlay at bottom-right corner with a sleek border
        if (webcamVideo.readyState >= 2) {
          const pipWidth = 280;
          const pipHeight = 210;
          const pipX = canvas.width - pipWidth - 30;
          const pipY = canvas.height - pipHeight - 30;

          // Draw dark card background behind PIP
          ctx.fillStyle = "#09090b";
          ctx.beginPath();
          ctx.roundRect(pipX - 4, pipY - 4, pipWidth + 8, pipHeight + 8, 16);
          ctx.fill();

          // Draw webcam inside a rounded clip path
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipWidth, pipHeight, 12);
          ctx.clip();
          ctx.drawImage(webcamVideo, pipX, pipY, pipWidth, pipHeight);
          ctx.restore();
        }

        animationFrameIdRef.current = requestAnimationFrame(drawFrame);
      };
      
      // Start composting loop
      drawFrame();

      // 5. Composite audio tracks using Web Audio API
      // @ts-expect-error — webkitAudioContext is a vendor-prefixed fallback not in TS types
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const destination = audioContext.createMediaStreamDestination();
      
      let hasAudio = false;

      // Connect webcam microphone
      if (webcamStream.getAudioTracks().length > 0) {
        const webcamAudioSource = audioContext.createMediaStreamSource(
          new MediaStream([webcamStream.getAudioTracks()[0]])
        );
        webcamAudioSource.connect(destination);
        hasAudio = true;
      }

      // Connect screen system audio if available
      if (screenStream.getAudioTracks().length > 0) {
        const screenAudioSource = audioContext.createMediaStreamSource(
          new MediaStream([screenStream.getAudioTracks()[0]])
        );
        screenAudioSource.connect(destination);
        hasAudio = true;
      }

      // 6. Capture canvas stream and combine with audio
      const canvasStream = canvas.captureStream(30);
      const combinedTracks = [...canvasStream.getVideoTracks()];
      
      if (hasAudio) {
        combinedTracks.push(...destination.stream.getAudioTracks());
      }

      const combinedStream = new MediaStream(combinedTracks);
      combinedStreamRef.current = combinedStream;

      // 7. Start MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp8,opus"
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedVideoUrl(videoUrl);
        setRecordingState("preview");
        stopAllStreams();
      };

      mediaRecorder.start(100);
      setRecordingState("recording");

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Failed to start recording:", err);
      setError(err?.message || "Permission denied or failed to access capture devices.");
      stopAllStreams();
      setRecordingState("idle");
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
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
    setUploadProgress(10);

    try {
      const formData = new FormData();
      // package blob as file
      const videoFile = new File([recordedBlob], "learning-share.webm", {
        type: "video/webm"
      });
      formData.append("file", videoFile);
      formData.append("studentName", studentName || "Anonymous Student");
      formData.append("email", studentEmail);
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      // Simulate progress bar up to 90%
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 15;
        });
      }, 300);

      const res = await fetch("/api/shared-videos/upload", {
        method: "POST",
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload recording.");
      }

      setRecordingState("success");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Network error. Failed to share recording.");
      setRecordingState("preview");
    }
  };

  return (
    <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-2xl overflow-hidden border border-zinc-800 relative group transition-all duration-300">
      
      {/* Background Micro Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/70 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[rgba(217,37,42,0.12)] border-[rgba(217,37,42,0.25)] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#D9252A]" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-white">Share What You Learned</h3>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Record and share your learning</p>
          </div>
        </div>

        {/* Status Indicators */}
        {recordingState === "recording" && (
          <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/30 px-3 py-1 rounded-full text-red-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[10px] font-bold font-mono tracking-widest uppercase">{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 relative z-10">
        
        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 text-xs bg-red-950/40 border border-red-900/50 rounded-xl text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* ── STATE: IDLE / START ── */}
        {recordingState === "idle" && (
          <div className="text-center py-6 space-y-4">
            <div className="relative inline-flex mb-2">
              <div className="w-16 h-16 rounded-3xl bg-zinc-800/50 border border-zinc-700/80 flex items-center justify-center">
                <Video className="w-7 h-7 text-zinc-400" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D9252A] flex items-center justify-center border-2 border-zinc-950">
                <Monitor className="w-3.5 h-3.5 text-white" />
              </span>
            </div>
            
            <div className="max-w-[280px] mx-auto">
              <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                Create a high-quality video sharing your screen and webcam at the same time. Perfect for assignments, project explainers, or summaries!
              </p>
            </div>

            <Button
              type="button"
              onClick={startRecording}
              className="bg-[#D9252A] hover:bg-[#EF4444] text-white rounded-xl px-5 h-11 text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 mr-2" /> Start Recording
            </Button>
          </div>
        )}

        {/* ── STATE: RECORDING ACTIVE ── */}
        {recordingState === "recording" && (
          <div className="space-y-4 text-center py-4">
            {/* Screen indicator */}
            <div className="bg-zinc-800/40 border border-zinc-700/30 rounded-2xl p-4 flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-[#D9252A]" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#D9252A] rounded-full border-2 border-zinc-900 flex items-center justify-center animate-bounce">
                  <Mic className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-white">Compositing screen + webcam</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Dual-channel canvas rendering in progress</p>
              </div>

              <div className="flex items-center gap-2 text-xs bg-red-950/60 border border-red-500/20 px-4 py-1.5 rounded-xl text-red-400 font-medium">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span>Recording in progress</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleStopRecording}
              className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-6 h-11 text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Square className="w-3.5 h-3.5 mr-2" /> Stop Recording
            </Button>
          </div>
        )}

        {/* ── STATE: PREVIEW & SUBMIT ── */}
        {recordingState === "preview" && recordedVideoUrl && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 aspect-video shadow-inner">
              <video 
                src={recordedVideoUrl} 
                controls 
                className="w-full h-full object-contain"
                playsInline
              />
            </div>

            {/* Optional caption field */}
            <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60">
              <Label htmlFor="video-caption" className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#D9252A]" />
                Add a caption or comment
              </Label>
              <Input
                id="video-caption"
                placeholder="What is this video about? (Optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs text-white placeholder-zinc-500 h-9 rounded-lg focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                onClick={resetRecorder}
                variant="outline"
                className="border-zinc-800 hover:bg-zinc-800/50 hover:text-white text-zinc-300 rounded-xl text-xs h-10 font-bold transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Record Again
              </Button>
              
              <Button
                type="button"
                onClick={uploadRecording}
                className="bg-[#D9252A] hover:bg-[#EF4444] text-white rounded-xl text-xs h-10 font-bold transition-all hover:scale-[1.02]"
              >
                <Share2 className="w-3.5 h-3.5 mr-2" /> Share Video
              </Button>
            </div>
          </div>
        )}

        {/* ── STATE: UPLOADING ── */}
        {recordingState === "uploading" && (
          <div className="text-center py-8 space-y-4">
            <RingLoader size="lg" />
            
            <div className="space-y-1">
              <p className="text-xs font-bold text-white">Uploading your learning video...</p>
              <p className="text-[10px] text-zinc-400 font-medium">Writing metadata and storing file</p>
            </div>

            {/* Custom progress bar */}
            <div className="max-w-[200px] mx-auto space-y-1">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#D9252A] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[9px] font-mono text-zinc-500">{uploadProgress}%</p>
            </div>
          </div>
        )}

        {/* ── STATE: SUCCESS ── */}
        {recordingState === "success" && (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[rgba(217,37,42,0.12)] border-[rgba(217,37,42,0.25)] flex items-center justify-center mx-auto text-[#D9252A]">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-black text-white">Video Shared Successfully!</p>
              <p className="text-[10px] text-zinc-400 font-medium">Your instructors can now watch your share</p>
            </div>

            <Button
              type="button"
              onClick={resetRecorder}
              className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl px-5 h-10 text-xs font-bold transition-all hover:scale-[1.03]"
            >
              Record Another Share
            </Button>
          </div>
        )}

      </div>
    </section>
  );
}
