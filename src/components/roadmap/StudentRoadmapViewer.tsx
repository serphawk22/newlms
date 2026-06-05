"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toggleSubtopicProgress } from "@/app/actions/roadmap";

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
    <div style={{ background: "var(--background)" }} className="rounded-xl overflow-hidden">
      
      {/* MAIN CONTENT */}
      <div style={{ background: "var(--card)" }}>
        
        {/* TOP NAV BAR */}
        <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex flex-col gap-1">
             <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Interactive Syllabus</h2>
             <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Follow the path and track your progress.</p>
          </div>
        </div>

        {errorToast && (
          <div className="fixed bottom-6 right-6 text-white px-6 py-3 rounded-lg shadow-lg font-medium text-sm animate-in slide-in-from-bottom-5 fade-in z-50" style={{ background: "#D9252A" }}>
            {errorToast}
          </div>
        )}

        <div className="p-8 md:p-12 max-w-4xl mx-auto pb-16">
          
          {phases.length === 0 && (
            <div className="text-center py-20 border border-dashed" style={{ borderColor: "var(--border)" }}>
              <p className="text-2xl mb-4" style={{ color: "var(--muted-foreground)" }}>Roadmap hasn&apos;t been created yet.</p>
            </div>
          )}

          {phases.map((phase, pIdx) => (
            <div key={phase.id} className="mb-24 relative">
              
              {/* PHASE HEADER */}
              <div className="mb-12 group">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[10px] tracking-widest font-bold px-3 py-1 uppercase rounded" style={{ background: "#D9252A", color: "#FFFFFF" }}>
                    PHASE {String(pIdx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] tracking-widest uppercase" style={{ color: "var(--muted-foreground)" }}>
                    {phase.topics.length} MODULES
                  </span>
                </div>
                
                <h2 className="text-5xl md:text-6xl leading-tight tracking-tight mb-4 font-bold" style={{ color: "var(--foreground)" }}>
                  {phase.title}
                </h2>
                {phase.description && (
                  <p className="text-2xl italic" style={{ color: "var(--muted-foreground)" }}>
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
                    <div key={topic.id} style={{ border: "1px solid var(--border)", background: "var(--card)" }} className="transition-all duration-200 group/topic rounded-lg">
                      
                      {/* TOPIC HEADER */}
                      <div className="p-6 md:p-8 flex items-center justify-between cursor-pointer" onClick={() => toggleTopic(topic.id)}>
                        <div className="flex items-center gap-6">
                          <div className={`w-5 h-5 border-2 transition-colors rounded`} style={isTopicDone ? { borderColor: "#D9252A", background: "#D9252A" } : { borderColor: "var(--border)" }} />
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "#D9252A", color: "#FFFFFF" }}>
                                M{String(tIdx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-[9px] tracking-widest uppercase" style={{ color: "var(--muted-foreground)" }}>
                                {topic.subtopics.length} TOPICS
                              </span>
                            </div>
                            <h3 className="text-3xl font-bold" style={isTopicDone ? { color: "var(--muted-foreground)", textDecoration: "line-through" } : { color: "var(--foreground)" }}>{topic.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex items-center justify-center rounded" style={{ border: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* SUBTOPICS */}
                      {isExpanded && (
                        <div className="p-6 md:p-8" style={{ borderTop: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                          <p className="text-[10px] tracking-widest uppercase mb-6 font-bold" style={{ color: "var(--muted-foreground)" }}>
                            TOPICS
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            {topic.subtopics.map((subtopic) => (
                              <label key={subtopic.id} className="flex items-start gap-3 group/sub cursor-pointer p-1 -ml-1 rounded transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="mt-1 w-3.5 h-3.5 cursor-pointer"
                                  style={{ accentColor: "#D9252A" }}
                                  checked={!!subtopic._isCompleted}
                                  onChange={() => handleToggleProgress(subtopic.id, !!subtopic._isCompleted)}
                                />
                                <span className="text-sm font-medium" style={subtopic._isCompleted ? { color: "var(--muted-foreground)", textDecoration: "line-through" } : { color: "var(--foreground)" }}>{subtopic.title}</span>
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
