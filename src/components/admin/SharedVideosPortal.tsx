"use client";

import { useState } from "react";
import {
  Video, 
  Trash2, 
  Calendar, 
  User, 
  Mail, 
  MessageSquare, 
  Play,
  X, 
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";

interface SharedVideo {
  id: string;
  studentName: string;
  email: string;
  videoUrl: string;
  caption: string | null;
  createdAt: string;
}

interface SharedVideosPortalProps {
  initialVideos: SharedVideo[];
}

export function SharedVideosPortal({ initialVideos }: SharedVideosPortalProps) {
  const [videos, setVideos] = useState<SharedVideo[]>(initialVideos);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  
  // Player state
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  
  // Action states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shared video recording? This will permanently delete the file from storage.")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/shared-videos?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete video");
      }

      setVideos((prev) => prev.filter((v) => v.id !== id));
      showToast("Video recording successfully deleted.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to delete video recording.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & Sort
  const filteredVideos = videos
    .filter((v) => {
      const query = searchQuery.toLowerCase();
      return (
        v.studentName.toLowerCase().includes(query) ||
        v.email.toLowerCase().includes(query) ||
        (v.caption && v.caption.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border transition-all duration-300 ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: "var(--foreground)" }}>
            <Video className="w-6 h-6" style={{ color: "#D9252A" }} />
            Shared Videos
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--muted-foreground)" }}>
            Manage and view recording submissions shared by students.
          </p>
        </div>
      </div>

      {/* Controls: Search, Sort */}
      <div className="rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by student, email, or caption..." className="w-full sm:flex-1" />

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
            className="rounded-xl text-xs font-bold px-3 py-2 h-10 focus:outline-none focus:ring-1 focus:ring-[#D9252A] cursor-pointer"
            style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredVideos.length === 0 && (
        <div className="rounded-2xl p-12 text-center" style={{ background: "var(--card)", border: "1px dashed var(--border)", boxShadow: "none" }}>
          <Video className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--border)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>No learning shares found</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            {searchQuery ? "Try refining your search terms." : "Student recordings will show up here once submitted."}
          </p>
        </div>
      )}

      {/* Grid Layout */}
      {filteredVideos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div 
              key={video.id} 
              className="rounded-2xl overflow-hidden transition-all group flex flex-col"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
            >
              {/* Interactive Player Placeholder with Overlay */}
              <div 
                onClick={() => setActiveVideoUrl(video.videoUrl)}
                className="aspect-video bg-zinc-950 relative flex items-center justify-center cursor-pointer overflow-hidden border-b border-zinc-100"
              >
                {/* Fallback canvas background / abstract graphic */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                  <Video className="w-10 h-10 text-zinc-700 group-hover:scale-110 transition-transform duration-300" />
                </div>
                
                {/* Hover Play Button */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                    <Play className="w-5 h-5 fill-white" />
                  </div>
                </div>

                {/* Badge showing video file extension or type */}
                <span className="absolute bottom-3 left-3 bg-zinc-900/80 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                  WEBM
                </span>
              </div>

              {/* Card Meta Content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  {/* Student details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-sm" style={{ color: "var(--foreground)" }}>
                      <User className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                      <span className="truncate">{video.studentName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                      <span className="truncate">{video.email}</span>
                    </div>
                  </div>

                  {/* Caption / message */}
                  {video.caption ? (
                    <div className="rounded-xl p-2.5 flex items-start gap-2 text-xs" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                      <p className="leading-normal line-clamp-3">{video.caption}</p>
                    </div>
                  ) : (
                    <div className="text-[11px] italic" style={{ color: "var(--muted-foreground)" }}>No caption provided</div>
                  )}
                </div>

                {/* Footer action bar */}
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold" style={{ borderTop: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                    <span>
                      {new Date(video.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleDelete(video.id)}
                    disabled={deletingId === video.id}
                    variant="outline"
                    className="h-8 px-2.5 rounded-lg text-xs" style={{ background: "var(--secondary-background)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(217,37,42,0.12)"; e.currentTarget.style.color = "#D9252A"; e.currentTarget.style.borderColor = "rgba(217,37,42,0.25)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--secondary-background)"; e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)" }}
                  >
                    {deletingId === video.id ? (
                      <Loader size="sm" variant="bars" />
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5 mr-1 shrink-0" /> Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Video Player */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden w-full max-w-3xl shadow-2xl relative">
            
            {/* Close button */}
            <button 
              onClick={() => setActiveVideoUrl(null)}
              className="absolute top-3 right-3 z-10 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 p-2 rounded-full text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Video player element */}
            <div className="aspect-video">
              <video 
                src={activeVideoUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
                playsInline
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
