"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, X, Send, Bot, User, AlertCircle,
  Sparkles, PlusCircle, Paperclip, FileText, ImageIcon, Trash2,
  ChevronLeft, ChevronRight, MessageSquare,
} from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";

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
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-12 w-12 rounded-full border transition-all"
      style={{
       background: "#343A40",
        borderColor: "#D9252A",
       color: "#E9ECEF",
        }}
    >
       {isOpen ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </button>
      {/* Main chat window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: sidebarOpen ? "680px" : "400px",
            height: "580px",
            background: "#1A1D20",
            border: "1px solid #D9252A",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
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
                  className="flex items-center gap-1 text-[11px] bg-black-600/60 hover:bg-red-500/80 text-white px-2 py-1 rounded-md transition-colors"
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
                          ? "bg-black-600/50 text-white"
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
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center border"
                style={{
                      background: "#343A40",
                      borderColor: "#D9252A",
                    }}
>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">AI Course Tutor</p>
                <p className="text-[11px] truncate" style={{ color: "#ADB5BD" }}>{courseTitle}</p>
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
                      ? "bg-gradient-to-br from-red-500 to-red-300"
                      : "bg-gradient-to-br from-red-500 to-red-200"
                  }`}>
                    {msg.role === "user"
                      ? <User className="w-3 h-3 text-white" />
                      : <Bot className="w-3 h-3 text-white" />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[80%] rounded-2xl text-sm leading-relaxed space-y-2 ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-tr-sm px-3 py-2"
                      : "bg-[#2B3035] text-[#E9ECEF] border border-[#D9252A] rounded-tl-sm px-3 py-2"
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
                  </div>
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="flex gap-2">
                  <div
                       className="w-6 h-6 rounded-full flex items-center justify-center border"
                       style={{
                        background: "#343A40",
                        borderColor: "#D9252A",
                          }}
                  >
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white/10 border border-white/10 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2">
                    <RingLoader size="sm" className="inline-flex" />
                    <span className="text-xs" style={{ color: "#ADB5BD" }}>Thinking…</span>
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
                <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                       background: "#2B3035",
                      border: "1px solid #495057",
                      }}
                >
                  {attachedFile.type.startsWith("image/") ? (
                    <img src={filePreviewUrl} alt="preview" className="w-10 h-10 rounded-md object-cover border border-white/20 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-md" style={{ background: "#343A40" }}>
                      <FileText className="w-5 h-5 text-[#ADB5BD]" />
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

              {/* Text input row */}
             <div
                className="flex gap-2 items-end rounded-xl px-3 py-2"
                style={{
                   background: "#2B3035",
                   border: "1px solid #495057",
                     }}
              >
                {/* File attach button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white/40 hover:text-red-400 transition-colors mb-0.5 shrink-0"
                  title="Attach file"
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
                  placeholder="Ask a doubt about this course…"
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none max-h-24 min-h-[20px] leading-5"
                  style={{ scrollbarWidth: "none" }}
                />

                <button
                  onClick={sendMessage}
                  disabled={isLoading || (!input.trim() && !attachedFile)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{
                       background: "#343A40",
                       border: "1px solid #D9252A",
                       }}
                >
                  <Send className="w-3 h-3 text-white" />
                </button>
              </div>

              <p className="text-white/20 text-[10px] text-center">
                Enter to send · Shift+Enter for new line · 📎 supports images, PDF, text
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
      `}</style>
    </>
  );
}
