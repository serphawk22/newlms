"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlayCircle, FileText, Radio, Video, Trash2, 
  MonitorPlay, BookOpen, ChevronDown, ChevronUp, 
  Clock, Plus, X, Calendar, CheckCircle2, Sparkles, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { StartClassButton } from "@/components/StartClassButton";

interface Lesson {
  id: string;
  title: string;
  videoUrl?: string | null;
  driveLink?: string | null;
}

interface LiveSession {
  id: string;
  roomId: string;
  title: string;
  status: "SCHEDULED" | "ONGOING" | "COMPLETED";
  scheduledAt: string | Date;
  recordingUrl?: string | null;
}

interface RecordedClass {
  id: string;
  title: string;
  videoUrl: string;
  duration?: number | null;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  liveSessions: LiveSession[];
  recordedClasses: RecordedClass[];
}

interface CourseRoadmapProps {
  courseId: string;
  modules: Module[];
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  createLessonAction?: (formData: FormData) => Promise<void>;
  createLiveSessionAction?: (formData: FormData) => Promise<void>;
  deleteLiveSessionAction?: (formData: FormData) => Promise<void>;
  deleteRecordedClassAction?: (formData: FormData) => Promise<void>;
}

export function CourseRoadmap({
  courseId,
  modules,
  role,
  createLessonAction,
  createLiveSessionAction,
  deleteLiveSessionAction,
  deleteRecordedClassAction,
}: CourseRoadmapProps) {
  const isEditor = role === "INSTRUCTOR" || role === "ADMIN";
  
  // Track expanded/collapsed state for modules
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    // Keep first module expanded by default
    const initial: Record<string, boolean> = {};
    if (modules.length > 0) {
      initial[modules[0].id] = true;
    }
    return initial;
  });

  // Track quick-add form visibility
  const [activeAddForm, setActiveAddForm] = useState<{
    moduleId: string;
    type: "LESSON" | "LIVE_CLASS";
  } | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto py-12 px-6 bg-[#0B0F19] rounded-[2.5rem] border border-slate-800/60 shadow-2xl overflow-hidden">
      {/* Background abstract glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[100px] -z-10 pointer-events-none" />

      {/* Course Roadmap Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 pb-8 border-b border-slate-800/80 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Roadmap</span>
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-white tracking-tight">Learning Pathway</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md leading-relaxed">
            {isEditor 
              ? "Build your curriculum map. Add stages, interactive subtopics, and live sessions below."
              : "Your step-by-step master plan. Complete modules to level up your skills."
            }
          </p>
        </div>

        {/* Global Progress or Editor badge */}
        <div className="shrink-0">
          {isEditor ? (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
              BUILDER MODE
            </span>
          ) : (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-2xl p-3 px-5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Status</div>
                <div className="text-sm text-slate-200 font-bold">Enrolled</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="text-center py-24 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl backdrop-blur-md relative z-10">
          <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-300">No Stages Yet</h3>
          <p className="text-slate-500 text-sm mt-2">Start adding modules to build out this roadmap.</p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-12 z-10">
          {/* Central Connecting Road track line (Neon glowing) */}
          <div className="absolute top-8 bottom-8 left-6 md:left-12 w-1.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] -translate-x-1/2 opacity-80" />

          {/* Module Nodes List */}
          <div className="space-y-16">
            {modules.map((module, idx) => {
              const isExpanded = !!expandedModules[module.id];
              const totalItems = module.lessons.length + module.liveSessions.length + module.recordedClasses.length;

              return (
                <motion.div 
                  key={module.id} 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="relative group"
                >
                  {/* Module Circular Node on the neon track */}
                  <div 
                    onClick={() => toggleModule(module.id)}
                    className={`absolute left-[-24px] md:left-[-48px] top-5 w-14 h-14 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all duration-300 z-10 hover:scale-110 ${
                      isExpanded 
                        ? "bg-indigo-600 border-indigo-300 text-white shadow-[0_0_20px_rgba(99,102,241,0.6)]" 
                        : "bg-slate-900 border-indigo-500/50 text-indigo-400 hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                    }`}
                  >
                    <span className="text-sm font-black">{idx + 1}</span>
                  </div>

                  {/* Module Card container with Dark Glassmorphism */}
                  <div className={`ml-10 md:ml-12 rounded-[2rem] border transition-all duration-300 overflow-hidden bg-slate-900/60 backdrop-blur-xl ${
                    isExpanded 
                      ? "border-indigo-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.5)]" 
                      : "border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80"
                  }`}>
                    {/* Module Card Header */}
                    <div 
                      onClick={() => toggleModule(module.id)}
                      className="p-6 md:p-8 flex items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-black text-indigo-400 tracking-wider uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                            STAGE {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {totalItems} topics
                          </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate group-hover:text-indigo-300 transition-colors">
                          {module.title}
                        </h3>
                      </div>
                      
                      {/* Collapse/Expand Toggle Button */}
                      <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isExpanded ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                      }`}>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Module Content / Sub-nodes */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-slate-800 bg-slate-950/50"
                        >
                          <div className="p-6 md:p-8 space-y-8">
                            
                            {/* --- TOPICS PATHWAYS --- */}
                            {totalItems === 0 ? (
                              <div className="text-center py-10 text-slate-500 text-sm">
                                No content added to this stage yet.
                              </div>
                            ) : (
                              <div className="relative pl-6 space-y-5">
                                {/* Inner connecting syllabus branch line */}
                                <div className="absolute top-2 bottom-8 left-2.5 w-[2px] bg-slate-800" />

                                {/* ── Lessons ── */}
                                {module.lessons.map((lesson, lIdx) => (
                                  <div key={lesson.id} className="relative flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-md hover:shadow-lg hover:border-indigo-500/30 transition-all group/item">
                                    {/* Sub-node branch dot */}
                                    <div className="absolute left-[-21px] w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-slate-950 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                    
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                        <BookOpen className="w-4 h-4 text-indigo-400" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-200 truncate">{lIdx + 1}. {lesson.title}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Sub-topic</p>
                                      </div>
                                    </div>

                                    {/* Action items */}
                                    <div className="flex items-center gap-3 shrink-0">
                                      {lesson.videoUrl && (
                                        <VideoPlayerModal videoUrl={lesson.videoUrl} title={lesson.title}>
                                          <Button size="sm" variant="outline" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs shadow-none">
                                            <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Watch
                                          </Button>
                                        </VideoPlayerModal>
                                      )}
                                      {lesson.driveLink && (
                                        <a href={lesson.driveLink} target="_blank" rel="noopener noreferrer">
                                          <Button size="sm" variant="outline" className="text-slate-600 border-slate-200 text-xs hover:bg-slate-50">
                                            <FileText className="w-3.5 h-3.5 mr-1" /> Read Notes
                                          </Button>
                                        </a>
                                      )}
                                      {!lesson.videoUrl && !lesson.driveLink && (
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Syllabus Node</span>
                                      )}
                                      {isEditor && (
                                        <Link href={`/instructor/courses/${courseId}/lessons/${lesson.id}`}>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                                            Edit
                                          </Button>
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {/* ── Live Sessions ── */}
                                {module.liveSessions.map((session) => {
                                  const now = new Date();
                                  const scheduledTime = new Date(session.scheduledAt);
                                  const diffMins = (scheduledTime.getTime() - now.getTime()) / 60000;
                                  const isLive = diffMins <= 5 && diffMins >= -120; 

                                  return (
                                    <div key={session.id} className="relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-md hover:shadow-lg hover:border-emerald-500/30 transition-all group/item gap-3">
                                      {/* Sub-node branch dot */}
                                      <div className={`absolute left-[-21px] md:top-1/2 md:-translate-y-1/2 top-7 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${isLive ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`} />
                                      
                                      <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${isLive ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                          <Radio className={`w-4 h-4 ${isLive ? 'text-red-400' : 'text-emerald-400'}`} />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold text-slate-200 truncate">{session.title}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isLive ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                                              {isLive ? 'Live Now' : 'Upcoming Webinar'}
                                            </span>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                              <Calendar className="w-3 h-3" /> {scheduledTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Action items */}
                                      <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                                        {session.recordingUrl && (
                                          <VideoPlayerModal videoUrl={session.recordingUrl} title={`Recording: ${session.title}`}>
                                            <Button variant="outline" size="sm" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs shadow-none">
                                              <MonitorPlay className="w-3.5 h-3.5 mr-1" /> Recording
                                            </Button>
                                          </VideoPlayerModal>
                                        )}
                                        {isLive && isEditor && (
                                          <StartClassButton 
                                            sessionId={session.id}
                                            roomId={session.roomId} 
                                          />
                                        )}
                                        {isLive && !isEditor && (
                                          <a href={`/meet/${session.roomId}`}>
                                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm animate-pulse">
                                              Join Live
                                            </Button>
                                          </a>
                                        )}
                                        {!isLive && !isEditor && (
                                          <Button size="sm" variant="outline" disabled className="text-slate-500 border-slate-700 bg-slate-800 text-xs">
                                            Starts soon
                                          </Button>
                                        )}
                                        {isEditor && deleteLiveSessionAction && (
                                          <form action={deleteLiveSessionAction}>
                                            <input type="hidden" name="id" value={session.id} />
                                            <input type="hidden" name="courseId" value={courseId} />
                                            <Button type="submit" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </form>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* ── Recorded Classes ── */}
                                {module.recordedClasses.map((rec) => (
                                  <div key={rec.id} className="relative flex items-center justify-between p-4 rounded-2xl border border-indigo-500/30 bg-indigo-900/20 shadow-md hover:shadow-lg transition-all group/item">
                                    {/* Sub-node branch dot */}
                                    <div className="absolute left-[-21px] w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-slate-950 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                    
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                        <MonitorPlay className="w-4 h-4 text-indigo-400" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-200 truncate">{rec.title}</p>
                                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                          <Clock className="w-3 h-3 text-slate-500" />
                                          {rec.duration ? `${Math.floor(rec.duration / 60)} min` : "Lecture Playback"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action items */}
                                    <div className="flex items-center gap-3 shrink-0">
                                      {rec.videoUrl && (
                                        <VideoPlayerModal videoUrl={rec.videoUrl} title={rec.title}>
                                          <Button size="sm" variant="outline" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs shadow-none">
                                            <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Watch
                                          </Button>
                                        </VideoPlayerModal>
                                      )}
                                      {isEditor && deleteRecordedClassAction && (
                                        <form action={deleteRecordedClassAction}>
                                          <input type="hidden" name="id" value={rec.id} />
                                          <input type="hidden" name="courseId" value={courseId} />
                                          <Button type="submit" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </form>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* --- IN-CONTEXT QUICK CREATOR (INSTRUCTORS & ADMINS ONLY) --- */}
                            {isExpanded && isEditor && (
                              <div className="pt-4 border-t border-slate-100/70 flex flex-wrap gap-2 justify-center">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 border-indigo-150 rounded-xl"
                                  onClick={() => setActiveAddForm({ moduleId: module.id, type: "LESSON" })}
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Sub-Topic Lesson
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 text-xs text-red-700 bg-red-50 hover:bg-red-100/70 border-red-150 rounded-xl"
                                  onClick={() => setActiveAddForm({ moduleId: module.id, type: "LIVE_CLASS" })}
                                >
                                  <Radio className="w-3.5 h-3.5 mr-1 text-red-500" /> Schedule Live Webinar
                                </Button>
                              </div>
                            )}

                            {/* --- FLOATING CREATION FORMS WITH ANIMATIONS --- */}
                            <AnimatePresence>
                              {activeAddForm?.moduleId === module.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10, height: 0 }}
                                  animate={{ opacity: 1, y: 0, height: "auto" }}
                                  exit={{ opacity: 0, y: -10, height: 0 }}
                                  className="border border-slate-200/80 bg-white/90 shadow-lg p-5 rounded-2xl space-y-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                      {activeAddForm.type === "LESSON" ? "Create New Lesson Topic" : "Schedule Live Webinar Stream"}
                                    </h4>
                                    <button 
                                      className="text-slate-400 hover:text-slate-600 p-0.5 hover:bg-slate-100 rounded-full"
                                      onClick={() => setActiveAddForm(null)}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {activeAddForm.type === "LESSON" && createLessonAction && (
                                    <form 
                                      action={async (formData) => {
                                        await createLessonAction(formData);
                                        setActiveAddForm(null);
                                      }}
                                      className="flex flex-col gap-3"
                                    >
                                      <input type="hidden" name="moduleId" value={module.id} />
                                      <input type="hidden" name="courseId" value={courseId} />
                                      
                                      <div className="space-y-1">
                                        <Input 
                                          name="title" 
                                          required 
                                          placeholder="Topic name (e.g. Introduction to Neural Networks)..." 
                                          className="text-sm rounded-xl h-10 border-slate-200 bg-white"
                                        />
                                      </div>
                                      
                                      <div className="flex justify-end gap-2 pt-1">
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-xs rounded-xl"
                                          onClick={() => setActiveAddForm(null)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          type="submit" 
                                          size="sm" 
                                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md"
                                        >
                                          Create Lesson Node
                                        </Button>
                                      </div>
                                    </form>
                                  )}

                                  {activeAddForm.type === "LIVE_CLASS" && createLiveSessionAction && (
                                    <form 
                                      action={async (formData) => {
                                        await createLiveSessionAction(formData);
                                        setActiveAddForm(null);
                                      }}
                                      className="flex flex-col gap-3"
                                    >
                                      <input type="hidden" name="moduleId" value={module.id} />
                                      <input type="hidden" name="courseId" value={courseId} />
                                      
                                      <div className="space-y-2">
                                        <Input 
                                          name="title" 
                                          required 
                                          placeholder="Webinar class title (e.g. Q&A and Project Review)..." 
                                          className="text-sm rounded-xl h-10 border-slate-200 bg-white"
                                        />
                                        <Input 
                                          name="scheduledAt" 
                                          type="datetime-local" 
                                          required
                                          className="text-sm rounded-xl h-10 border-slate-200 bg-white"
                                        />
                                      </div>
                                      
                                      <div className="flex justify-end gap-2 pt-1">
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-xs rounded-xl"
                                          onClick={() => setActiveAddForm(null)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          type="submit" 
                                          size="sm" 
                                          className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md"
                                        >
                                          Schedule Webinar
                                        </Button>
                                      </div>
                                    </form>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
