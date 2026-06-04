"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Send, Bot, User, Loader2, Sparkles,
  ChevronDown, MessageCircle, RotateCcw, Zap,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface LMSAssistantProps {
  /** Passed from the layout server component via the JWT-decoded role */
  userRole: "STUDENT" | "INSTRUCTOR" | "ADMIN" | string;
  userName?: string;
}

// ── Role-specific config (unified dark theme) ──────────────────────────────────
const ROLE_CONFIG: Record<
  string,
  {
    label: string;
    gradient: string;
    btnGradient: string;
    accent: string;
    prompts: string[];
  }
> = {
  STUDENT: {
    label: "LMS Student Assistant",
    gradient: "from-[#0A0A0A] via-[#111111] to-[#161616]",
    btnGradient: "[#D9252A]",
    accent: "red",
    prompts: [
      "How do I enroll in a course?",
      "How do I join a live class?",
      "Where can I see my progress?",
      "How do I submit an assignment?",
    ],
  },
  INSTRUCTOR: {
    label: "LMS Instructor Assistant",
    gradient: "from-[#0A0A0A] via-[#111111] to-[#161616]",
    btnGradient: "[#D9252A]",
    accent: "red",
    prompts: [
      "How do I create a new course?",
      "How do I schedule a live class?",
      "How do I upload study materials?",
      "How do I create a quiz?",
    ],
  },
  ADMIN: {
    label: "LMS Admin Assistant",
    gradient: "from-[#0A0A0A] via-[#111111] to-[#161616]",
    btnGradient: "[#D9252A]",
    accent: "red",
    prompts: [
      "How do I manage users?",
      "How do I generate reports?",
      "How do I configure org settings?",
      "How do I view all courses?",
    ],
  },
};

function getRoleConfig(role: string) {
  return ROLE_CONFIG[role] ?? ROLE_CONFIG.STUDENT;
}

// ── Markdown bold renderer ────────────────────────────────────────────────────
function renderContent(content: string) {
  return content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function LMSAssistant({ userRole, userName }: LMSAssistantProps) {
  const cfg = getRoleConfig(userRole);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = userName ? `Hi ${userName}! ` : "Hi! ";
      setMessages([
        {
          role: "assistant",
          content: `${greeting}👋 I'm your LMS Assistant. Ask me anything about using the platform — navigation, features, workflows, and more!`,
          timestamp: new Date(),
        },
      ]);
    }
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen, messages.length, userName]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = { role: "user", content: trimmed, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);
      setError(null);

      // Build history from existing messages (excluding the new one we just pushed)
      const history = messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/lms-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }

        const assistantMsg: Message = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Increment unread badge if chat is minimized
        if (isMinimized) {
          setUnreadCount((n) => n + 1);
        }
      } catch {
        setError("Network error. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, isMinimized]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setUnreadCount(0);
  };

  const toggleOpen = () => {
    setIsOpen((p) => !p);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const minimize = () => {
    setIsMinimized(true);
  };

  const maximize = () => {
    setIsMinimized(false);
    setUnreadCount(0);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  return (
    <>
      {/* ─── Floating Action Button ─── */}
      {!isOpen && (
        <button
          id="lms-assistant-fab"
          onClick={toggleOpen}
          aria-label="Open LMS Assistant"
          title="LMS Assistant — Ask me anything!"
          className="fixed bottom-6 right-6 z-[60] flex items-center justify-center bg-[#D9252A] text-white w-14 h-14 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300"
          style={{
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)`,
            animation: "lmsAssistantBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold border border-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ─── Chat Window ─── */}
      {isOpen && (
        <div
          id="lms-assistant-window"
          className={`fixed right-6 z-[60] flex flex-col rounded-2xl overflow-hidden transition-all duration-300`}
          style={{
            bottom: "24px",
            width: "380px",
            height: isMinimized ? "60px" : "560px",
            background: `linear-gradient(145deg, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to))`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
            animation: "lmsChatSlideIn 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Dark gradient layer as CSS custom property workaround */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111111] to-[#161616] rounded-2xl"
            style={{ zIndex: -1 }}
          />

          {/* ── Header ── */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A2A] bg-[#0A0A0A] shrink-0 cursor-pointer"
            onClick={isMinimized ? maximize : undefined}
          >
            <div
              className="w-8 h-8 rounded-full bg-[#D9252A] flex items-center justify-center"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">{cfg.label}</p>
              <p className="text-white/50 text-[10px] flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D9252A] animate-pulse" />
                Online · Role: {userRole}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Clear chat */}
              {!isMinimized && messages.length > 1 && (
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  aria-label="Clear chat history"
                  className="text-white/30 hover:text-white/70 transition-colors p-1 rounded"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Minimize */}
              <button
                onClick={isMinimized ? maximize : minimize}
                title={isMinimized ? "Expand" : "Minimize"}
                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                className="text-white/40 hover:text-white/80 transition-colors p-1 rounded"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${isMinimized ? "rotate-180" : ""}`}
                />
              </button>
              {/* Close */}
              <button
                onClick={toggleOpen}
                title="Close"
                aria-label="Close LMS Assistant"
                className="text-white/40 hover:text-white/80 transition-colors p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Body (hidden when minimized) ── */}
          {!isMinimized && (
            <>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    style={{ animation: "lmsMsgFadeIn 0.2s ease" }}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                          : "bg-[rgba(217,37,42,0.12)]"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="w-3 h-3 text-white" />
                      ) : (
                        <Bot className="w-3 h-3 text-white" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[82%] rounded-2xl text-sm leading-relaxed px-3 py-2 ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-600/80 to-blue-500/80 text-white rounded-tr-sm border border-white/10"
                          : "bg-white/10 text-white/90 border border-white/10 rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{renderContent(msg.content)}</p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2">
                    <div
                      className="w-6 h-6 rounded-full bg-[rgba(217,37,42,0.12)] flex items-center justify-center shrink-0"
                    >
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-white/10 border border-white/10 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-white/60 animate-spin" />
                      <span className="text-xs text-white/50">Thinking…</span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2">
                    <p className="text-red-300 text-xs">{error}</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Suggested prompts (only when chat is fresh) ── */}
              {messages.length <= 1 && !isLoading && (
                <div className="px-3 pb-2 shrink-0">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1.5 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Quick Questions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.prompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-[11px] bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/25 text-white/70 hover:text-white px-2.5 py-1 rounded-full transition-all duration-200 truncate max-w-[170px]"
                        title={prompt}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Input area ── */}
              <div className="shrink-0 px-3 pb-3 pt-1 border-t border-white/10 bg-black/10 space-y-2">
                <div className="flex items-end gap-2 bg-white/10 border border-white/15 focus-within:border-white/30 rounded-xl px-3 py-2 transition-all duration-200">
                  <textarea
                    ref={inputRef}
                    id="lms-assistant-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about the LMS…"
                    disabled={isLoading}
                    rows={1}
                    aria-label="LMS Assistant message input"
                    className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none max-h-20 min-h-[20px] leading-5"
                    style={{ scrollbarWidth: "none" }}
                  />
                  <button
                    id="lms-assistant-send"
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim()}
                    aria-label="Send message to LMS Assistant"
                    className="w-8 h-8 rounded-lg bg-[#D9252A] flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <p className="text-white/20 text-[10px] text-center">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Keyframe animations ─── */}
      <style>{`
        @keyframes lmsAssistantBounceIn {
          from { opacity: 0; transform: scale(0.7) translateY(16px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);    }
        }
        @keyframes lmsChatSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes lmsMsgFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        #lms-assistant-window {
          position: fixed;
        }
      `}</style>
    </>
  );
}
