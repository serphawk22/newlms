"use client";

import React, { useState } from "react";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toggleSubtopicProgress } from "@/app/actions/roadmap";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"] });

type Subtopic = { id: string; title: string; order: number; _isCompleted?: boolean };
type Topic = { id: string; title: string; order: number; subtopics: Subtopic[] };
type Phase = { id: string; title: string; description: string | null; order: number; topics: Topic[] };
type Roadmap = { id: string; phases: Phase[] };

export default function StudentRoadmapViewer({
  courseId,
  initialRoadmap,
  completedSubtopicIds,
}: {
  courseId: string;
  initialRoadmap: Roadmap | null;
  completedSubtopicIds: string[];
}) {
  const [phases, setPhases] = useState<Phase[]>(() => {
    if (!initialRoadmap) return [];
    const compSet = new Set(completedSubtopicIds);
    return initialRoadmap.phases.map(p => ({
      ...p,
      topics: p.topics.map(t => ({
        ...t,
        subtopics: t.subtopics.map(s => ({
          ...s,
          _isCompleted: compSet.has(s.id)
        }))
      }))
    }));
  });

  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const totalSubtopics = phases.reduce((acc, p) => acc + p.topics.reduce((acc2, t) => acc2 + t.subtopics.length, 0), 0);
  const completedCount = phases.reduce((acc, p) => acc + p.topics.reduce((acc2, t) => acc2 + t.subtopics.filter(s => s._isCompleted).length, 0), 0);
  const progressPercent = totalSubtopics > 0 ? Math.round((completedCount / totalSubtopics) * 100) : 0;

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleProgress = async (subtopicId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    
    // Optimistic UI update
    setPhases(phases.map(p => ({
      ...p,
      topics: p.topics.map(t => ({
        ...t,
        subtopics: t.subtopics.map(s => s.id === subtopicId ? { ...s, _isCompleted: nextCompleted } : s)
      }))
    })));

    // Server request
    const res = await toggleSubtopicProgress(courseId, subtopicId, nextCompleted);
    if (!res.success) {
      // Revert if failed
      setPhases(phases.map(p => ({
        ...p,
        topics: p.topics.map(t => ({
          ...t,
          subtopics: t.subtopics.map(s => s.id === subtopicId ? { ...s, _isCompleted: currentCompleted } : s)
        }))
      })));
      setErrorToast("Failed to update progress. Please try again.");
      setTimeout(() => setErrorToast(null), 3000);
    }
  };

  return (
    <div className="bg-[#F5F5F0] text-[#111] font-sans selection:bg-black selection:text-white rounded-xl overflow-hidden">
      
      {/* MAIN CONTENT */}
      <div className="relative bg-white min-h-[600px]">
        
        {/* TOP NAV BAR */}
        <div className="border-b border-[#E0E0DB] bg-white/80 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
             <h2 className={`${playfair.className} text-2xl font-bold`}>Interactive Syllabus</h2>
             <p className="text-sm text-black/50">Follow the path and track your progress.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="border border-black px-4 py-2 text-right">
              <p className={`${jetbrains.className} text-[9px] text-black/50 tracking-widest mb-0.5`}>SYLLABUS PROGRESS</p>
              <div className="flex items-baseline justify-end gap-2">
                <span className={`${playfair.className} text-2xl leading-none`}>{progressPercent}%</span>
                <span className={`${jetbrains.className} text-[10px] text-black/40`}>{completedCount}/{totalSubtopics}</span>
              </div>
            </div>
          </div>
        </div>

        {errorToast && (
          <div className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg font-medium text-sm animate-in slide-in-from-bottom-5 fade-in z-50">
            {errorToast}
          </div>
        )}

        <div className="p-8 md:p-12 max-w-4xl mx-auto pb-16">
          
          {phases.length === 0 && (
            <div className="text-center py-20 border border-dashed border-black/20">
              <p className={`${playfair.className} text-2xl text-black/50 mb-4`}>Roadmap hasn&apos;t been created yet.</p>
            </div>
          )}

          {phases.map((phase, pIdx) => (
            <div key={phase.id} className="mb-24 relative">
              
              {/* PHASE HEADER */}
              <div className="mb-12 group">
                <div className="flex items-center gap-4 mb-4">
                  <span className={`${jetbrains.className} bg-[#104FE8] text-white text-[10px] tracking-widest font-bold px-3 py-1 uppercase`}>
                    PHASE {String(pIdx + 1).padStart(2, "0")}
                  </span>
                  <span className={`${jetbrains.className} text-[10px] text-black/40 tracking-widest uppercase`}>
                    {phase.topics.length} MODULES
                  </span>
                </div>
                
                <h2 className={`${playfair.className} text-5xl md:text-6xl text-[#111] leading-tight tracking-tight mb-4`}>
                  {phase.title}
                </h2>
                {phase.description && (
                  <p className={`${playfair.className} text-2xl text-black/50 italic`}>
                    {phase.description}
                  </p>
                )}
              </div>

              {/* TOPICS CONTAINER */}
              <div className="space-y-6">
                {phase.topics.map((topic, tIdx) => {
                  const isExpanded = expandedTopics[topic.id] || false;
                  
                  // Check if topic is fully completed
                  const topicTotal = topic.subtopics.length;
                  const topicCompleted = topic.subtopics.filter(s => s._isCompleted).length;
                  const isTopicDone = topicTotal > 0 && topicTotal === topicCompleted;

                  return (
                    <div key={topic.id} className="border border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 transition-all duration-200 group/topic">
                      
                      {/* TOPIC HEADER */}
                      <div className="p-6 md:p-8 flex items-center justify-between cursor-pointer" onClick={() => toggleTopic(topic.id)}>
                        <div className="flex items-center gap-6">
                          <div className={`w-5 h-5 border-2 ${isTopicDone ? "border-[#104FE8] bg-[#104FE8]" : "border-black/20 group-hover/topic:border-black"} transition-colors`} />
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`${jetbrains.className} bg-[#104FE8] text-white text-[10px] font-bold px-2 py-0.5`}>
                                M{String(tIdx + 1).padStart(2, "0")}
                              </span>
                              <span className={`${jetbrains.className} text-[9px] text-black/40 tracking-widest uppercase`}>
                                {topic.subtopics.length} TOPICS
                              </span>
                            </div>
                            <h3 className={`${playfair.className} text-3xl ${isTopicDone ? "text-black/50 line-through" : "text-black"}`}>{topic.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 border border-black flex items-center justify-center bg-[#F5F5F0]">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* SUBTOPICS */}
                      {isExpanded && (
                        <div className="border-t border-black p-6 md:p-8 bg-[#FDFDFD]">
                          <p className={`${jetbrains.className} text-[10px] text-black/40 tracking-widest uppercase mb-6`}>
                            TOPICS
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            {topic.subtopics.map((subtopic) => (
                              <label key={subtopic.id} className="flex items-start gap-3 group/sub cursor-pointer hover:bg-black/5 p-1 -ml-1 rounded transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="mt-1 w-3.5 h-3.5 accent-[#104FE8] cursor-pointer"
                                  checked={!!subtopic._isCompleted}
                                  onChange={() => handleToggleProgress(subtopic.id, !!subtopic._isCompleted)}
                                />
                                <span className={`text-sm font-medium ${subtopic._isCompleted ? "text-black/40 line-through" : "text-black/80"}`}>{subtopic.title}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
