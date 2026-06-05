"use client";

import { useState } from "react";
import { 
  Search, 
  Trash2, 
  Play, 
  X, 
  Calendar, 
  Mail, 
  User, 
  BookOpen, 
  FileText 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VideoItem {
  id: string;
  studentName: string;
  email: string;
  videoUrl: string;
  caption: string | null;
  createdAt: string;
}

interface Props {
  initialVideos: VideoItem[];
}

function parseCaption(caption: string | null) {
  if (!caption) return { comment: "", courseTitle: "General Course" };
  const courseMatch = caption.match(/\(Course: (.*?)\)/);
  if (courseMatch) {
    const courseTitle = courseMatch[1];
    const comment = caption.replace(/\(Course: (.*?)\)/, "").trim();
    return { comment, courseTitle };
  }
  const courseOnlyMatch = caption.match(/^Course: (.*?)$/);
  if (courseOnlyMatch) {
    return { comment: "", courseTitle: courseOnlyMatch[1] };
  }
  return { comment: caption, courseTitle: "General Course" };
}

export function LearningVideosClient({ initialVideos }: Props) {
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shared video?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/shared-videos?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete video");
      }
    } catch {
      alert("Network error. Failed to delete video.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVideos = videos.filter((v) => {
    const searchLower = search.toLowerCase();
    const { comment, courseTitle } = parseCaption(v.caption);
    return (
      v.studentName.toLowerCase().includes(searchLower) ||
      v.email.toLowerCase().includes(searchLower) ||
      comment.toLowerCase().includes(searchLower) ||
      courseTitle.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md bg-white border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm">
        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
        <Input
          type="text"
          placeholder="Search by student, course, or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 h-auto text-sm"
        />
      </div>

      {filteredVideos.length === 0 ? (
        <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl shadow-sm text-zinc-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
          <p className="font-semibold text-sm">No videos found</p>
          <p className="text-xs text-zinc-400 mt-1">Students have not uploaded any video shares matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => {
            const { comment, courseTitle } = parseCaption(video.caption);
            const dateStr = new Date(video.createdAt).toLocaleDateString("en-IN", {
              dateStyle: "medium"
            });

            return (
              <Card key={video.id} className="border border-zinc-200 shadow-sm overflow-hidden bg-white hover:border-zinc-300 transition-all group flex flex-col justify-between">
                <div>
                  {/* Video Thumbnail/Preview Area */}
                  <div className="bg-zinc-950 aspect-video relative flex items-center justify-center group-hover:opacity-90 transition-opacity">
                    <video 
                      src={video.videoUrl} 
                      preload="metadata" 
                      className="w-full h-full object-cover opacity-60"
                    />
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="absolute inset-0 flex items-center justify-center text-white bg-black/35 hover:bg-black/45 transition-colors"
                      aria-label="Play video"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/30 scale-100 hover:scale-105 transition-all">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Course Badge */}
                    <div className="flex items-center gap-1.5 text-xs text-[#D9252A] font-bold tracking-tight bg-[rgba(217,37,42,0.06)] border border-[rgba(217,37,42,0.15)] w-fit px-2.5 py-1 rounded-full">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{courseTitle}</span>
                    </div>

                    {/* Student Identity */}
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-zinc-900 text-sm leading-tight flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {video.studentName}
                      </h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {video.email}
                      </p>
                    </div>

                    {/* Student Notes / Caption */}
                    {comment && (
                      <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-600 italic leading-normal">{comment}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{dateStr}</span>
                  </div>

                  <Button
                    onClick={() => handleDelete(video.id)}
                    disabled={deletingId === video.id}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50/50 h-8 rounded-lg text-xs font-semibold px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Video Watch Overlay Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm transition-all animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-zinc-200 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm leading-tight">
                  {selectedVideo.studentName}&apos;s learning share
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider font-semibold">
                  {parseCaption(selectedVideo.caption).courseTitle}
                </p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="bg-zinc-950 aspect-video flex items-center justify-center shadow-inner">
              <video
                src={selectedVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Optional Caption */}
            {parseCaption(selectedVideo.caption).comment && (
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/30">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Student notes</p>
                <p className="text-sm text-zinc-700 leading-relaxed italic">
                  &ldquo;{parseCaption(selectedVideo.caption).comment}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
