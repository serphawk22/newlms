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
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
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

export interface AdminVideoItem {
  id: string;
  courseName: string;
  moduleName: string;
  lessonName: string;
  instructorName: string;
  videoUrl: string;
  status: string;
  uploadedAt: string;
}

interface Props {
  initialVideos: VideoItem[];
  initialAdminVideos?: AdminVideoItem[];
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

function StatusBadge({ status }: { status: string }) {
  const colors =
    status === "APPROVED"
      ? "bg-green-100 text-green-700"
      : status === "REJECTED"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${colors}`}>
      {status}
    </span>
  );
}

export function LearningVideosClient({ initialVideos, initialAdminVideos = [] }: Props) {
  const [activeTab, setActiveTab] = useState<"STUDENT_SHARES" | "INSTRUCTOR_LESSONS">("INSTRUCTOR_LESSONS");
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [adminVideos, setAdminVideos] = useState<AdminVideoItem[]>(initialAdminVideos);
  const [search, setSearch] = useState("");
  const [selectedStudentVideo, setSelectedStudentVideo] = useState<VideoItem | null>(null);
  const [selectedAdminVideo, setSelectedAdminVideo] = useState<AdminVideoItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shared video?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/shared-videos?id=${id}`, { method: "DELETE" });
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

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/review-videos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setAdminVideos((prev) =>
          prev.map((v) => (v.id === id ? { ...v, status } : v))
        );
        // Update modal if it's open
        setSelectedAdminVideo((prev) => (prev?.id === id ? { ...prev, status } : prev));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update video status");
      }
    } catch {
      alert("Network error. Failed to update video status.");
    } finally {
      setUpdatingId(null);
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

  const filteredAdminVideos = adminVideos.filter((v) => {
    const searchLower = search.toLowerCase();
    return (
      v.instructorName.toLowerCase().includes(searchLower) ||
      v.courseName.toLowerCase().includes(searchLower) ||
      v.moduleName.toLowerCase().includes(searchLower) ||
      v.lessonName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("INSTRUCTOR_LESSONS")}
          className={`pb-3 px-1 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "INSTRUCTOR_LESSONS"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Instructor Lesson Videos ({adminVideos.length})
        </button>
        <button
          onClick={() => setActiveTab("STUDENT_SHARES")}
          className={`pb-3 px-1 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "STUDENT_SHARES"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Student Shares ({videos.length})
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md bg-white border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm">
        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
        <Input
          type="text"
          placeholder="Search by name, course, or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 h-auto text-sm"
        />
      </div>

      {/* Tab: Student Shares */}
      {activeTab === "STUDENT_SHARES" && (
        filteredVideos.length === 0 ? (
          <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl shadow-sm text-zinc-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            <p className="font-semibold text-sm">No videos found</p>
            <p className="text-xs text-zinc-400 mt-1">Students have not uploaded any video shares matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => {
              const { comment, courseTitle } = parseCaption(video.caption);
              const dateStr = new Date(video.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" });
              return (
                <Card key={video.id} className="border border-zinc-200 shadow-sm overflow-hidden bg-white hover:border-zinc-300 transition-all group flex flex-col justify-between">
                  <div>
                    <div className="bg-zinc-950 aspect-video relative flex items-center justify-center group-hover:opacity-90 transition-opacity">
                      <video
                        src={video.videoUrl}
                        preload="metadata"
                        className="w-full h-full object-cover opacity-60"
                      />
                      <button
                        onClick={() => setSelectedStudentVideo(video)}
                        className="absolute inset-0 flex items-center justify-center text-white bg-black/35 hover:bg-black/45 transition-colors"
                        aria-label="Play video"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/30 scale-100 hover:scale-105 transition-all">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold tracking-tight bg-blue-50/50 border border-blue-100/50 w-fit px-2.5 py-1 rounded-full">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{courseTitle}</span>
                      </div>
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
                      {comment && (
                        <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-600 italic leading-normal">{comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
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
        )
      )}

      {/* Tab: Instructor Lesson Videos */}
      {activeTab === "INSTRUCTOR_LESSONS" && (
        filteredAdminVideos.length === 0 ? (
          <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl shadow-sm text-zinc-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            <p className="font-semibold text-sm">No videos found</p>
            <p className="text-xs text-zinc-400 mt-1">No instructor lesson videos matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAdminVideos.map((video) => {
              const dateStr = new Date(video.uploadedAt).toLocaleDateString("en-IN", { dateStyle: "medium" });
              return (
                <Card key={video.id} className="border border-zinc-200 shadow-sm overflow-hidden bg-white hover:border-zinc-300 transition-all group flex flex-col justify-between">
                  <div>
                    <div className="bg-zinc-950 aspect-video relative flex items-center justify-center group-hover:opacity-90 transition-opacity">
                      {video.videoUrl.includes("drive.google.com") ? (
                        <div className="text-zinc-500 flex flex-col items-center">
                          <Play className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-xs font-semibold">Google Drive Link</span>
                        </div>
                      ) : (
                        <video
                          src={video.videoUrl}
                          preload="metadata"
                          className="w-full h-full object-cover opacity-60"
                        />
                      )}
                      <button
                        onClick={() => setSelectedAdminVideo(video)}
                        className="absolute inset-0 flex items-center justify-center text-white bg-black/35 hover:bg-black/45 transition-colors"
                        aria-label="Preview video"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/30 scale-100 hover:scale-105 transition-all">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-1.5 text-xs text-purple-600 font-bold tracking-tight bg-purple-50/50 border border-purple-100/50 w-fit px-2.5 py-1 rounded-full">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{video.courseName}</span>
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-zinc-900 text-sm leading-tight">{video.lessonName}</h3>
                        <p className="text-xs text-zinc-500 font-medium">Module: {video.moduleName}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-100">
                          <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          Instructor: {video.instructorName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{dateStr}</span>
                      </div>
                      <StatusBadge status={video.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleUpdateStatus(video.id, "APPROVED")}
                        disabled={video.status === "APPROVED" || updatingId === video.id}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 disabled:opacity-40 h-8 rounded-lg text-xs font-semibold"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleUpdateStatus(video.id, "REJECTED")}
                        disabled={video.status === "REJECTED" || updatingId === video.id}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 h-8 rounded-lg text-xs font-semibold"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Modal: Student Video */}
      {selectedStudentVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-zinc-200 relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm leading-tight">
                  {selectedStudentVideo.studentName}&apos;s learning share
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider font-semibold">
                  {parseCaption(selectedStudentVideo.caption).courseTitle}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentVideo(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-zinc-950 aspect-video flex items-center justify-center shadow-inner">
              <video
                src={selectedStudentVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            {parseCaption(selectedStudentVideo.caption).comment && (
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/30">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Student notes</p>
                <p className="text-sm text-zinc-700 leading-relaxed italic">
                  &ldquo;{parseCaption(selectedStudentVideo.caption).comment}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Admin Review Video */}
      {selectedAdminVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-zinc-200 relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm leading-tight">
                  {selectedAdminVideo.lessonName}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider font-semibold">
                  {selectedAdminVideo.courseName} · {selectedAdminVideo.moduleName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedAdminVideo.status} />
                <button
                  onClick={() => setSelectedAdminVideo(null)}
                  className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="bg-zinc-950 aspect-video flex items-center justify-center shadow-inner">
              {selectedAdminVideo.videoUrl.includes("drive.google.com") ? (
                <div className="text-center text-zinc-400 p-8">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-semibold mb-2">Google Drive Video</p>
                  <a
                    href={selectedAdminVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 underline hover:text-blue-300"
                  >
                    Open in Google Drive →
                  </a>
                </div>
              ) : (
                <video
                  src={selectedAdminVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                <span className="font-semibold">Instructor:</span> {selectedAdminVideo.instructorName}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleUpdateStatus(selectedAdminVideo.id, "APPROVED")}
                  disabled={selectedAdminVideo.status === "APPROVED" || updatingId === selectedAdminVideo.id}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 h-8 rounded-lg text-xs font-semibold px-4"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedAdminVideo.id, "REJECTED")}
                  disabled={selectedAdminVideo.status === "REJECTED" || updatingId === selectedAdminVideo.id}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-40 h-8 rounded-lg text-xs font-semibold px-4"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
