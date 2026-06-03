"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, X, Send, Bot, User, Loader2, AlertCircle,
  Sparkles, PlusCircle, Paperclip, FileText, ImageIcon, Trash2,
  ChevronLeft, ChevronRight, MessageSquare, Mic, MicOff,
  Volume2, VolumeX,
} from "lucide-react";

// ---------- Types ----------
interface Message {
  role: "user" | "assistant";
  content: string;
  filePreview?: string; // base64 data-url for display only (never sent to server after request)
  fileType?: string;
  fileName?: string;
}

interface ChatSession {
  id: string;
  createdAt: string;
  messages: { content: string }[];
}

interface CourseChatbotProps {
  courseId: string;
  courseTitle: string;
}

// ---------- Helpers ----------
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:...;base64," prefix → send raw base64 only
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getChatLabel(chat: ChatSession): string {
  const firstMsg = chat.messages[0]?.content;
  if (firstMsg) return firstMsg.slice(0, 38) + (firstMsg.length > 38 ? "…" : "");
  return "New conversation";
}

// ---------- Component ----------
export function CourseChatbot({ courseId, courseTitle }: CourseChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [chatId, setChatId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Voice input ────────────────────────────────────────────────────────────
  const [isListening, setIsListening]           = useState(false);
  const [speechSupported, setSpeechSupported]   = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // ── Text-to-Speech ──────────────────────────────────────────────────────────
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
  const [ttsSupported, setTtsSupported]     = useState(false);

  // ---- Fetch chat list ----
  const fetchChatList = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/history?courseId=${courseId}`);
      if (!res.ok) return;
      const data = await res.json();
      setChatList(data.chats ?? []);
    } catch { /* silent */ }
  }, [courseId]);

  useEffect(() => {
    if (isOpen) {
      fetchChatList();
      if (messages.length === 0 && !chatId) {
        setMessages([{
          role: "assistant",
          content: `Hi! I'm your AI tutor for **${courseTitle}**. Ask me anything about the course — concepts, assignments, or upload a file for help! 🎓`,
        }]);
      }
    }
  }, [isOpen, courseId, courseTitle, fetchChatList, messages.length, chatId]);

  // ---- Auto-scroll ----
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // ---- Focus input when opened ----
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // ── Check Web Speech API support (runs once on mount) ─────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSpeechSupported(!!(window.SpeechRecognition ?? window.webkitSpeechRecognition));
      setTtsSupported(!!("speechSynthesis" in window));
    }
  }, []);

  // ── Cleanup recognition on component unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  // ---- Load a previous chat ----
  const loadChat = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/history?chatId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setChatId(id);
      setMessages(
        (data.messages ?? []).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
      setError(null);
    } catch { setError("Failed to load conversation."); }
  };

  // ---- New Chat ----
  const startNewChat = () => {
    fetchChatList(); // refresh sidebar so current chat appears in history
    setChatId(null);
    setMessages([{
      role: "assistant",
      content: `Hi! I'm your AI tutor for **${courseTitle}**. What would you like to know? 🎓`,
    }]);
    setError(null);
    clearAttachment();
  };

  // ---- Delete a chat ----
  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/history?chatId=${id}`, { method: "DELETE" });
    if (chatId === id) startNewChat();
    fetchChatList();
  };

  // ---- File handling ----
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain"];
    if (!allowed.includes(file.type)) {
      setError("Unsupported file type. Please upload an image, PDF, or text file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB allowed.");
      return;
    }

    setAttachedFile(file);
    const dataUrl = await fileToDataUrl(file);
    setFilePreviewUrl(dataUrl);
    setError(null);
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---- Send message ----
  const sendMessage = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || isLoading) return;

    // Optimistically add user message
    const userMsg: Message = {
      role: "user",
      content: trimmed || (attachedFile ? `[Attached: ${attachedFile.name}]` : ""),
      ...(filePreviewUrl ? { filePreview: filePreviewUrl, fileType: attachedFile?.type, fileName: attachedFile?.name } : {}),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    let fileBase64: string | undefined;
    let fileType: string | undefined;

    if (attachedFile) {
      fileBase64 = await fileToBase64(attachedFile);
      fileType = attachedFile.type;
    }
    clearAttachment();

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          chatId,
          message: trimmed || `[File attached: ${attachedFile?.name ?? "file"}]`,
          ...(fileBase64 ? { fileBase64, fileType } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Save the chatId returned by server (if new chat was created)
      if (data.chatId && !chatId) {
        setChatId(data.chatId);
        fetchChatList(); // refresh sidebar
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      // Auto-read the new AI response (fires after state update via idx = prev.length)
      if (ttsSupported) {
        // Use setTimeout to let React flush state before we read messages.length
        setTimeout(() => {
          setMessages((prev) => {
            const newIdx = prev.length - 1;
            speakMessage(data.reply, newIdx);
            return prev; // no-op state update — we only need the current length
          });
        }, 0);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---- Voice input toggle ----
  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      setError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    // ── Stop if already listening ──────────────────────────────────────────
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript("");
      return;
    }

    // ── Start recognition ─────────────────────────────────────────────────
    try {
      const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!SR) {
        setSpeechSupported(false);
        setError("Speech recognition is not supported in this browser.");
        return;
      }

      const recognition: ISpeechRecognition = new SR();
      recognition.continuous     = true;
      recognition.interimResults = true;
      recognition.lang           = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let interim   = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) { finalText += t; }
          else { interim += t; }
        }
        if (finalText) {
          setInput((prev) => {
            const base = prev.trimEnd();
            return base ? base + " " + finalText : finalText;
          });
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        setIsListening(false);
        setInterimTranscript("");
        const code = event.error;
        if (code === "not-allowed" || code === "permission-denied") {
          setError("Microphone permission denied. Please allow access in your browser and try again.");
        } else if (code === "no-speech") {
          setError("No speech detected. Please speak closer to the microphone.");
        } else if (code === "network") {
          setError("Network error during speech recognition. Please check your connection.");
        } else if (code === "audio-capture") {
          setError("No microphone found. Please connect a microphone and try again.");
        } else if (code !== "aborted") {
          setError("Unable to recognize speech. Please try again.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setError("Failed to start speech recognition. Please try again.");
    }
  }, [isListening, speechSupported]);

  // ── Text-to-Speech helpers ─────────────────────────────────────────────────
  /** Strip markdown bold markers so they are not read aloud */
  const stripMarkdown = (text: string) =>
    text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*/g, "");

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setSpeakingMsgIdx(null);
  }, []);

  const speakMessage = useCallback((text: string, idx: number) => {
    if (!ttsSupported) return;
    // Stop anything currently playing first
    window.speechSynthesis.cancel();
    setSpeakingMsgIdx(null);

    const plain = stripMarkdown(text);
    if (!plain.trim()) return;

    try {
      const utterance = new SpeechSynthesisUtterance(plain);
      utterance.lang  = "en-US";
      utterance.rate  = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setSpeakingMsgIdx(idx);
      utterance.onend   = () => setSpeakingMsgIdx(null);
      utterance.onerror = (e) => {
        setSpeakingMsgIdx(null);
        // "interrupted" fires when .cancel() is called intentionally — not a real error
        if (e.error !== "interrupted" && e.error !== "canceled") {
          setError("Unable to read the response aloud. Please try again.");
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMsgIdx(null);
      setError("Text-to-speech failed. Your browser may not support this feature.");
    }
  }, [ttsSupported]);

  /** Toggle: if already speaking this message → stop; otherwise start */
  const toggleSpeak = useCallback((text: string, idx: number) => {
    if (speakingMsgIdx === idx) {
      stopSpeaking();
    } else {
      speakMessage(text, idx);
    }
  }, [speakingMsgIdx, speakMessage, stopSpeaking]);

  // ---- Simple bold renderer ----
  const renderContent = (content: string) =>
    content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );

  // ---- JSX ----
  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        aria-label="Toggle AI Tutor"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600 text-white w-12 h-12 rounded-full shadow-2xl hover:from-violet-500 hover:to-indigo-500 transition-all duration-300"
        style={{ boxShadow: "0 8px 32px rgba(109,40,217,0.45)" }}
      >
        {isOpen
          ? <X className="w-5 h-5" />
          : <>
              <Bot className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            </>}
      </button>

      {/* Main chat window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: sidebarOpen ? "680px" : "400px",
            height: "580px",
            background: "linear-gradient(145deg,#1e1b4b 0%,#312e81 100%)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.3)",
            animation: "chatSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            transition: "width 0.3s ease",
          }}
        >
          {/* ======= SIDEBAR ======= */}
          {sidebarOpen && (
            <div className="w-[260px] shrink-0 flex flex-col border-r border-white/10 bg-black/20">
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
                <span className="text-white/80 text-xs font-bold uppercase tracking-widest">History</span>
                <button
                  onClick={startNewChat}
                  className="flex items-center gap-1 text-[11px] bg-violet-600/60 hover:bg-violet-500/80 text-white px-2 py-1 rounded-md transition-colors"
                >
                  <PlusCircle className="w-3 h-3" /> New Chat
                </button>
              </div>

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto py-1">
                {chatList.length === 0 ? (
                  <div className="px-3 py-6 text-center text-white/30 text-xs">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    No previous chats
                  </div>
                ) : (
                  chatList.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className={`group flex items-center justify-between px-3 py-2.5 mx-1 my-0.5 rounded-lg cursor-pointer transition-colors ${
                        chat.id === chatId
                          ? "bg-violet-600/50 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white/90"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        <span className="text-xs truncate">{getChatLabel(chat)}</span>
                      </div>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======= MAIN CHAT PANEL ======= */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10 bg-white/5 shrink-0">
              <button
                onClick={() => setSidebarOpen((p) => !p)}
                className="text-white/40 hover:text-white/80 transition-colors"
              >
                {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">AI Course Tutor</p>
                <p className="text-violet-300 text-[11px] truncate">{courseTitle}</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                      : "bg-gradient-to-br from-violet-500 to-indigo-500"
                  }`}>
                    {msg.role === "user"
                      ? <User className="w-3 h-3 text-white" />
                      : <Bot className="w-3 h-3 text-white" />}
                  </div>

                  {/* Bubble */}
                  <div className={`relative max-w-[80%] rounded-2xl text-sm leading-relaxed space-y-2 group/bubble ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-tr-sm px-3 py-2"
                      : "bg-white/10 text-white/90 border border-white/10 rounded-tl-sm px-3 py-2"
                  }`}>
                    {/* File preview if exists */}
                    {msg.filePreview && msg.fileType?.startsWith("image/") && (
                      <img
                        src={msg.filePreview}
                        alt="attachment"
                        className="rounded-lg max-h-36 object-cover border border-white/20"
                      />
                    )}
                    {msg.filePreview && !msg.fileType?.startsWith("image/") && (
                      <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1.5 border border-white/10">
                        <FileText className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                        <span className="text-[11px] text-violet-200 truncate">{msg.fileName}</span>
                      </div>
                    )}
                    {/* Text content */}
                    {msg.content && <p className="whitespace-pre-wrap">{renderContent(msg.content)}</p>}

                    {/* Speaker button — AI messages only */}
                    {msg.role === "assistant" && ttsSupported && msg.content && (
                      <button
                        onClick={() => toggleSpeak(msg.content, idx)}
                        aria-label={speakingMsgIdx === idx ? "Stop reading AI response" : "Read AI response aloud"}
                        title={speakingMsgIdx === idx ? "Stop reading" : "Read aloud"}
                        className={`absolute -bottom-2 right-2 flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200 opacity-0 group-hover/bubble:opacity-100 focus:opacity-100 ${
                          speakingMsgIdx === idx
                            ? "bg-violet-500 text-white shadow-lg shadow-violet-500/40"
                            : "bg-white/15 text-white/50 hover:bg-white/25 hover:text-white"
                        }`}
                      >
                        {speakingMsgIdx === idx
                          ? <VolumeX className="w-2.5 h-2.5" />
                          : <Volume2 className="w-2.5 h-2.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white/10 border border-white/10 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-violet-300 animate-spin" />
                    <span className="text-xs text-violet-300">Thinking…</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-500/20 border border-red-500/30 rounded-xl p-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-xs leading-relaxed">{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="shrink-0 p-3 border-t border-white/10 bg-white/5 space-y-2">
              {/* File preview above input */}
              {attachedFile && filePreviewUrl && (
                <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
                  {attachedFile.type.startsWith("image/") ? (
                    <img src={filePreviewUrl} alt="preview" className="w-10 h-10 rounded-md object-cover border border-white/20 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-violet-800/60 flex items-center justify-center border border-white/20 shrink-0">
                      <FileText className="w-5 h-5 text-violet-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{attachedFile.name}</p>
                    <p className="text-white/40 text-[10px]">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={clearAttachment} className="text-white/40 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Listening indicator + interim transcript */}
              {isListening && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-500/15 border border-red-500/30 rounded-lg">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-red-300 text-[11px] font-medium shrink-0">Listening…</span>
                  {interimTranscript && (
                    <span className="text-white/40 text-[11px] italic truncate flex-1">
                      {interimTranscript}
                    </span>
                  )}
                </div>
              )}

              {/* Text input row */}
              <div
                className={`flex gap-2 items-end rounded-xl border px-3 py-2 transition-all duration-200 ${
                  isListening
                    ? "bg-red-500/10 border-red-500/40 focus-within:border-red-400/60"
                    : "bg-white/10 border-white/15 focus-within:border-violet-400/60"
                }`}
              >
                {/* File attach button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white/40 hover:text-violet-300 transition-colors mb-0.5 shrink-0"
                  title="Attach file"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,text/plain"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Speak now… or type here" : "Ask a doubt about this course…"}
                  disabled={isLoading}
                  rows={1}
                  aria-label="Chat message input"
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none max-h-24 min-h-[20px] leading-5"
                  style={{ scrollbarWidth: "none" }}
                />

                {/* Mic toggle button */}
                {speechSupported && (
                  <button
                    onClick={toggleListening}
                    disabled={isLoading}
                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                    title={isListening ? "Stop listening" : "Voice input"}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isListening
                        ? "bg-red-500 hover:bg-red-400 mic-pulse"
                        : "text-white/40 hover:text-violet-300 hover:bg-white/10"
                    }`}
                  >
                    {isListening
                      ? <MicOff className="w-3.5 h-3.5 text-white" />
                      : <Mic   className="w-3.5 h-3.5" />}
                  </button>
                )}

                <button
                  onClick={sendMessage}
                  disabled={isLoading || (!input.trim() && !attachedFile)}
                  aria-label="Send message"
                  className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:from-violet-400 hover:to-indigo-400 transition-all"
                >
                  <Send className="w-3 h-3 text-white" />
                </button>
              </div>

              <p className="text-white/20 text-[10px] text-center">
                Enter to send · Shift+Enter for new line · 🎤 voice input · 📎 images, PDF, text
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(239,68,68,0.6); }
          50%       { box-shadow: 0 0 0 7px rgba(239,68,68,0);   }
        }
        .mic-pulse { animation: micPulse 1.4s ease-in-out infinite; }
      `}</style>
    </>
  );
}
