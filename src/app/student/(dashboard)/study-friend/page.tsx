"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Upload,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  FileText,
  Plus,
  Sparkles,
  BookOpen,
  ArrowRight,
  RefreshCw,
  UploadCloud,
  Inbox,
  ArrowUp,
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { uploadToCloudinaryDirect } from "@/lib/uploads";
import { getFileIcon, formatFileSize, getFileExtension } from "@/lib/file-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudySession {
  id: string;
  title: string;
  fileName: string | null;
  fileUrl: string | null;
  fileExt: string | null;
  extractedText: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

// ── Simple Content Formatter ───────────────────────────────────────────────
function formatChatContent(content: string) {
  if (!content) return null;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const codeLines = part.slice(3, -3).trim().split("\n");
      let language = "";
      if (codeLines.length > 0 && /^[a-zA-Z0-9+#-]+$/.test(codeLines[0])) {
        language = codeLines.shift() || "";
      }
      const code = codeLines.join("\n");
      return (
        <pre
          key={index}
          className="my-3 p-3 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg text-xs overflow-x-auto font-mono shadow-sm"
        >
          {language && (
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 border-b border-zinc-800 pb-1">
              {language}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    const lines = part.split("\n");
    return (
      <div key={index} className="space-y-1.5">
        {lines.map((line, lineIdx) => {
          if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
            const listContent = line.trim().substring(2);
            return (
              <ul key={lineIdx} className="list-disc list-inside ml-4 space-y-1">
                <li>{parseInlineFormatting(listContent)}</li>
              </ul>
            );
          }
          return (
            <p key={lineIdx} className="min-h-[1rem]">
              {parseInlineFormatting(line)}
            </p>
          );
        })}
      </div>
    );
  });
}

function parseInlineFormatting(text: string) {
  const inlineParts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return inlineParts.map((inlinePart, i) => {
    if (inlinePart.startsWith("**") && inlinePart.endsWith("**")) {
      return <strong key={i} className="font-bold text-[var(--foreground)]">{inlinePart.slice(2, -2)}</strong>;
    }
    if (inlinePart.startsWith("`") && inlinePart.endsWith("`")) {
      return (
        <code key={i} className="bg-[var(--secondary-background)] text-[var(--foreground)] px-1 py-0.5 rounded text-xs font-mono border border-[var(--border)]">
          {inlinePart.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{inlinePart}</span>;
  });
}

export default function StudyFriendPage() {
  // State variables
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);

  // New session form state
  const [newTitle, setNewTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");

  // Input states
  const [inputText, setInputText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cloudinary config
  const [cldCloudName, setCldCloudName] = useState<string | null>(null);
  const [cldPreset, setCldPreset] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // ── Initial Config & Sessions Fetch ────────────────────────────────────────
  useEffect(() => {
    async function loadConfigAndSessions() {
      try {
        const res = await fetch("/api/study-friend/sessions");
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions);
        }
      } catch (err) {
        console.error("Failed to load study sessions", err);
      } finally {
        setLoadingSessions(false);
      }

      try {
        const configRes = await fetch("/api/config");
        if (configRes.ok) {
          const configData = await configRes.json();
          setCldCloudName(configData.cloudinaryCloudName);
          setCldPreset(configData.cloudinarySubmissionsPreset);
        }
      } catch (err) {
        console.error("Failed to fetch direct upload config", err);
      }
    }

    loadConfigAndSessions();
  }, []);

  // ── Fetch Chat Messages when Session Changes ──────────────────────────────
  const loadSession = useCallback(async (session: StudySession) => {
    setActiveSession(session);
    setLoadingChat(true);
    setErrorMsg(null);
    setInputText("");

    try {
      const res = await fetch(`/api/study-friend/sessions/${session.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setErrorMsg("Failed to load session conversation.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Connection error loading session details.");
    } finally {
      setLoadingChat(false);
    }
  }, []);

  // ── Auto-scroll to Bottom of Chat ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingChat]);

  // ── Drag and Drop Handlers ────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newTitle.trim()) {
        const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        setNewTitle(baseName);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newTitle.trim()) {
        const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        setNewTitle(baseName);
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ── Create Study Session Flow ──────────────────────────────────────────────
  const handleCreateSession = async () => {
    if (!newTitle.trim()) {
      setErrorMsg("Please enter a session title.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setErrorMsg(null);

    let finalUrl = null;
    let finalName = null;
    let finalExt = null;
    let finalMime = null;
    let fileBase64: string | null = null;

    try {
      if (selectedFile) {
        const cloudName = cldCloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = cldPreset || process.env.NEXT_PUBLIC_CLOUDINARY_SUBMISSIONS_PRESET || "lms_submissions";

        if (!cloudName) {
          throw new Error("Direct upload is not properly configured on the server.");
        }

        setUploadProgressMsg("Uploading document to secure cloud storage...");
        const uploadResult = await uploadToCloudinaryDirect(selectedFile, {
          cloudName,
          preset: uploadPreset,
          onProgress: (pct) => setUploadProgress(pct),
        });

        finalUrl = uploadResult.secure_url;
        finalName = selectedFile.name;
        finalExt = getFileExtension(selectedFile.name) || uploadResult.format;
        finalMime = selectedFile.type;
      }

      setUploadProgress(95);
      setUploadProgressMsg("Extracting text contents and initializing your Study Friend...");

      const formData = new FormData();
      formData.append("title", newTitle.trim());
      if (finalUrl) formData.append("fileUrl", finalUrl);
      if (finalName) formData.append("fileName", finalName);
      if (finalExt) formData.append("fileExt", finalExt);
      if (finalMime) formData.append("fileMime", finalMime);
      if (selectedFile) formData.append("file", selectedFile);

      const res = await fetch("/api/study-friend/sessions", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create study session.");
      }

      const createdSession = await res.json();

      setSessions((prev) => [createdSession, ...prev]);

      setNewTitle("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadSession(createdSession);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to initialize study session. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadProgressMsg("");
    }
  };

  // ── Send Message Flow ──────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!activeSession || !inputText.trim() || sending) return;

    const userMessageText = inputText.trim();
    setInputText("");
    setErrorMsg(null);

    const tempUserMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: userMessageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await fetch("/api/study-friend/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          message: userMessageText,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response from AI.");
      }

      const assistantMsg = await res.json();
      setMessages((prev) => [...prev, assistantMsg]);

      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === activeSession.id ? { ...s, updatedAt: new Date().toISOString() } : s
        );
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "AI was unable to answer. Please try again.");
    } finally {
      setSending(false);
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  };

  // ── Delete Session Flow ───────────────────────────────────────────────────
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this study session? This action is permanent.")) return;

    try {
      const res = await fetch(`/api/study-friend/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSession?.id === sessionId) {
          setActiveSession(null);
          setMessages([]);
          setErrorMsg(null);
        }
      } else {
        alert("Failed to delete session.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to delete endpoint.");
    }
  };

  // ── Enter Key Listener ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const fileDetails = activeSession
    ? {
        name: activeSession.fileName || "No document attached",
        ext: activeSession.fileExt || "None",
        words: activeSession.extractedText
          ? activeSession.extractedText.split(/\s+/).filter(Boolean).length
          : 0,
      }
    : null;

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex h-full w-full bg-[var(--background)] text-[var(--foreground)]"
    >
      {/* ========================================================================= */}
      {/* LEFT: MAIN CONTENT                                                       */}
      {/* ========================================================================= */}
      <div className="flex-1 min-w-0">
        {!activeSession ? (
          /* ── Onboarding / Create Session ── */
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">Study Friend</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Upload a document and ask questions grounded strictly in its content.
                  </p>
                </div>

                {/* Session Name Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Session Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Physics Chapter 3, Economics Lecture Notes"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={uploading}
                    className="w-full h-10 px-3 border border-[var(--border)] bg-[var(--background)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:ring-0 focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                {/* File Upload Area */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Document / Notebook File
                  </label>

                  {!selectedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                        isDragging
                          ? "border-[var(--accent)] bg-[var(--secondary-background)]"
                          : "border-[var(--border)] bg-[var(--secondary-background)] hover:bg-[var(--background)]"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                        accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,text/csv"
                        disabled={uploading}
                      />
                      <UploadCloud className="w-10 h-10 text-[var(--muted-foreground)] mb-4" />
                      <span className="text-sm text-[var(--muted-foreground)]">
                        Drag and drop your document here, or{" "}
                        <span className="text-[var(--foreground)] underline cursor-pointer">browse</span>
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)] mt-2">
                        Supports PDF, DOCX, PPTX, TXT, MD, CSV (Max 50MB)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-[var(--secondary-background)] border border-[var(--border)] rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-[var(--card)] border border-[var(--border)] rounded-lg flex items-center justify-center text-[var(--muted-foreground)] shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeSelectedFile}
                        disabled={uploading}
                        className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-[var(--card)] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress & Feedback */}
                {uploading && (
                  <div className="space-y-2 bg-[var(--secondary-background)] p-4 rounded-xl border border-[var(--border)]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[var(--foreground)] font-medium">
                        <Loader size="sm" variant="ring" />
                        {uploadProgressMsg}
                      </span>
                      <span className="font-bold text-[var(--foreground)]">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 p-4 rounded-xl dark:bg-red-950/50 dark:border-red-900">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">{errorMsg}</p>
                  </div>
                )}

                <button
                  onClick={handleCreateSession}
                  disabled={uploading || !newTitle.trim() || !selectedFile}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-white rounded-lg h-10 px-6 opacity-90 hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {uploading ? (
                    <>
                      <Loader size="sm" variant="ring" />
                      Initializing Session…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create Study Session
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          /* ── Active Chat ── */
          <div className="flex-1 flex flex-col h-full">
            {/* Topbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[var(--foreground)] truncate">
                    {activeSession.title}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    <span className="text-[11px] text-[var(--muted-foreground)] font-medium">
                      Grounded AI Buddy
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveSession(null);
                  setMessages([]);
                  setErrorMsg(null);
                }}
                className="flex items-center gap-1.5 text-xs text-[var(--foreground)] font-medium px-3 py-2 bg-[var(--secondary-background)] hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Session
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeSession.fileName && (
                <div className="flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl max-w-3xl mx-auto">
                  <div className="w-10 h-10 bg-[var(--secondary-background)] text-[var(--muted-foreground)] rounded-lg flex items-center justify-center shrink-0 border border-[var(--border)]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {activeSession.fileName}
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      Grounded document text is ready. Questions will be answered strictly from this file.
                    </p>
                  </div>
                </div>
              )}

              {messages.length === 0 && !loadingChat && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] rounded-2xl flex items-center justify-center">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[var(--foreground)]">No messages yet</h3>
                    <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
                      Ask your first question about this document to start the grounded learning session.
                    </p>
                  </div>
                </motion.div>
              )}

              {loadingChat ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader variant="ring" />
                  <span className="text-sm text-[var(--muted-foreground)] mt-3">Loading conversation history…</span>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex gap-3 ${
                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          msg.role === "user"
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--secondary-background)] border border-[var(--border)] text-[var(--muted-foreground)]"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <span className="text-[10px] font-bold uppercase">Me</span>
                        ) : (
                          <Brain className="w-4 h-4" />
                        )}
                      </div>

                      <div
                        className={`rounded-2xl px-4 py-2 text-sm leading-relaxed max-w-[80%] ${
                          msg.role === "user"
                            ? "bg-[var(--accent)] text-white rounded-br-sm"
                            : "bg-[var(--secondary-background)] text-[var(--foreground)] rounded-bl-sm"
                        }`}
                      >
                        {formatChatContent(msg.content)}
                      </div>
                    </motion.div>
                  ))}

                  {sending && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--secondary-background)] border border-[var(--border)] text-[var(--muted-foreground)] flex items-center justify-center shrink-0">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="bg-[var(--secondary-background)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-2 flex items-center gap-2">
                        <Loader size="sm" variant="ring" />
                        <span className="text-sm text-[var(--muted-foreground)]">Thinking based on document…</span>
                      </div>
                    </motion.div>
                  )}

                  {errorMsg && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 p-4 rounded-xl max-w-xl mx-auto dark:bg-red-950/50 dark:border-red-900">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorMsg}</p>
                    </div>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-[var(--border)] p-4 bg-[var(--card)]">
              <div className="max-w-3xl mx-auto flex gap-2 items-center">
                <textarea
                  ref={textInputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending || loadingChat}
                  placeholder="Ask a question about the document content..."
                  className="flex-1 h-10 px-3 border border-[var(--border)] bg-[var(--background)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none outline-none focus:border-[var(--accent)] focus:ring-0 transition-colors disabled:opacity-50 leading-[40px]"
                  style={{ scrollbarWidth: "none" }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || loadingChat || !inputText.trim()}
                  className="w-10 h-10 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white flex items-center justify-center shrink-0 disabled:bg-[var(--border)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RIGHT: SESSIONS PANEL                                                    */}
      {/* ========================================================================= */}
      <div className="w-80 shrink-0 border-l border-[var(--border)] bg-[var(--card)] h-full sticky top-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border)]">
          <BookOpen className="w-4 h-4 text-[var(--foreground)]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">Study Sessions</span>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--muted-foreground)]">
              <Loader size="sm" variant="ring" />
              <span className="text-xs mt-2 text-[var(--muted-foreground)]">Loading sessions…</span>
            </div>
          ) : sortedSessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Inbox className="w-10 h-10 mb-3 text-[var(--muted-foreground)] opacity-50" />
              <p className="text-sm text-[var(--muted-foreground)]">No sessions yet</p>
              <p className="text-xs text-[var(--muted-foreground)] opacity-70 mt-1">Create your first session above</p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {sortedSessions.map((session) => {
                const isSelected = activeSession?.id === session.id;
                return (
                  <motion.div
                    key={session.id}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    onClick={() => loadSession(session)}
                    className={`group flex items-start justify-between p-3 cursor-pointer border-b border-[var(--border)] hover:bg-[var(--secondary-background)] transition-colors ${
                      isSelected ? "bg-[var(--secondary-background)] border-l-2 border-l-[var(--accent)]" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1 shrink-0">
                          <MessageSquare className="w-3 h-3" />
                          {session._count?.messages || 0}
                        </span>
                        <span className="truncate">
                          {session.fileName || "No document"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1.5 rounded text-[var(--muted-foreground)] hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--card)] transition-all ml-2 shrink-0"
                      title="Delete study session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}