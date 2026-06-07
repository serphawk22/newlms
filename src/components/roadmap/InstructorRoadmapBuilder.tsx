"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Edit2 } from "lucide-react";
import {
  createPhase,
  updatePhase,
  deletePhase,
  createTopic,
  updateTopic,
  deleteTopic,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
  reorderPhases,
} from "@/app/actions/roadmap";


type Subtopic = { id: string; title: string; order: number; progress?: unknown[] };
type Topic = { id: string; title: string; order: number; subtopics: Subtopic[] };
type Phase = { id: string; title: string; description: string | null; order: number; topics: Topic[] };
type Roadmap = { id: string; phases: Phase[] };

type ModalType = "ADD_PHASE" | "EDIT_PHASE" | "DELETE_PHASE" | "ADD_TOPIC" | "EDIT_TOPIC" | "DELETE_TOPIC" | "ADD_SUBTOPIC" | "EDIT_SUBTOPIC" | "DELETE_SUBTOPIC" | null;

export default function InstructorRoadmapBuilder({
  courseId,
  initialRoadmap,
}: {
  courseId: string;
  initialRoadmap: Roadmap | null;
}) {
  const [phases, setPhases] = useState<Phase[]>(initialRoadmap?.phases || []);
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (initialRoadmap) {
      setPhases((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(initialRoadmap.phases)) {
          return initialRoadmap.phases;
        }
        return prev;
      });
    }
  }, [initialRoadmap]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: ModalType;
    targetId?: string;
    parentId?: string;
    initialTitle?: string;
    initialDesc?: string;
  }>({ isOpen: false, type: null });
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (type: ModalType, payload?: { targetId?: string; parentId?: string; initialTitle?: string; initialDesc?: string | null }) => {
    setModalState({ 
      isOpen: true, 
      type, 
      targetId: payload?.targetId, 
      parentId: payload?.parentId, 
      initialTitle: payload?.initialTitle, 
      initialDesc: payload?.initialDesc ?? undefined 
    });
    setFormTitle(payload?.initialTitle || "");
    setFormDesc(payload?.initialDesc || "");
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null });
    setFormTitle("");
    setFormDesc("");
  };

  const handleModalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { type, targetId, parentId } = modalState;
      if (type === "ADD_PHASE") await createPhase(courseId, formTitle, formDesc || undefined);
      if (type === "EDIT_PHASE" && targetId) await updatePhase(courseId, targetId, { title: formTitle, description: formDesc || undefined });
      if (type === "DELETE_PHASE" && targetId) await deletePhase(courseId, targetId);
      
      if (type === "ADD_TOPIC" && parentId) await createTopic(courseId, parentId, formTitle);
      if (type === "EDIT_TOPIC" && targetId) await updateTopic(courseId, targetId, { title: formTitle });
      if (type === "DELETE_TOPIC" && targetId) await deleteTopic(courseId, targetId);
      
      if (type === "ADD_SUBTOPIC" && parentId) await createSubtopic(courseId, parentId, formTitle);
      if (type === "EDIT_SUBTOPIC" && targetId) await updateSubtopic(courseId, targetId, { title: formTitle });
      if (type === "DELETE_SUBTOPIC" && targetId) await deleteSubtopic(courseId, targetId);

      closeModal();
      router.refresh();
    } catch (_e) {
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [draggedPhaseIdx, setDraggedPhaseIdx] = useState<number | null>(null);
  const handlePhaseDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditing) {
      e.preventDefault();
      return;
    }
    setDraggedPhaseIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handlePhaseDrop = async (e: React.DragEvent, dropIndex: number) => {
    if (draggedPhaseIdx === null || draggedPhaseIdx === dropIndex || !isEditing) return;
    const newPhases = [...phases];
    const [draggedItem] = newPhases.splice(draggedPhaseIdx, 1);
    newPhases.splice(dropIndex, 0, draggedItem);
    
    setPhases(newPhases.map((p, i) => ({ ...p, order: i })));
    setDraggedPhaseIdx(null);

    const updates = newPhases.map((p, i) => ({ id: p.id, order: i }));
    await reorderPhases(courseId, updates);
  };

  return (
    <div style={{ background: "var(--background)" }} className="rounded-xl overflow-hidden relative">
      <div style={{ background: "var(--card)" }}>
        <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Interactive Syllabus</h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Manage the course learning path and track student progress.</p>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-[10px] uppercase tracking-widest font-bold px-4 py-2 transition-all"
              style={isEditing ? { background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" } : { background: "var(--foreground)", color: "var(--background)", border: "1px solid var(--border)" }}
            >
              {isEditing ? "Disable Edit Mode" : "Enable Edit Mode"}
            </button>
          </div>
        </div>

        <div className="p-8 md:p-12 max-w-4xl mx-auto pb-16">
          {phases.length === 0 && (
            <div className="text-center py-20 border border-dashed" style={{ borderColor: "var(--border)" }}>
              <p className="text-2xl mb-4" style={{ color: "var(--muted-foreground)" }}>No Roadmap Found</p>
              {isEditing && (
                <button onClick={() => openModal("ADD_PHASE")} className="text-white px-6 py-2 rounded text-sm transition-colors" style={{ background: "var(--foreground)" }}>
                  Create First Phase
                </button>
              )}
            </div>
          )}

          {phases.map((phase, pIdx) => (
            <div key={phase.id} className="mb-24 relative" draggable={isEditing} onDragStart={(e) => handlePhaseDragStart(e, pIdx)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handlePhaseDrop(e, pIdx)}>
              <div className="mb-12 group">
                <div className="flex items-center gap-4 mb-4">
                  {isEditing && (
                    <div className="cursor-move transition-colors" style={{ color: "var(--border)" }} title="Drag to reorder phase">
                      <GripVertical size={20} />
                    </div>
                  )}
                  <span className="text-[10px] tracking-widest font-bold px-3 py-1 uppercase rounded" style={{ background: "#D9252A", color: "#FFFFFF" }}>
                    PHASE {String(pIdx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] tracking-widest uppercase" style={{ color: "var(--muted-foreground)" }}>
                    {phase.topics.length} MODULES
                  </span>
                  {isEditing && (
                    <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal("EDIT_PHASE", { targetId: phase.id, initialTitle: phase.title, initialDesc: phase.description })} className="text-xs px-2 py-1 flex items-center gap-1" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}><Edit2 size={12}/> Edit</button>
                      <button onClick={() => openModal("DELETE_PHASE", { targetId: phase.id })} className="text-xs px-2 py-1 flex items-center gap-1 transition-colors" style={{ border: "1px solid rgba(217,37,42,0.3)", color: "#D9252A" }}><Trash2 size={12} /> Delete</button>
                    </div>
                  )}
                </div>
                <h2 className="text-5xl md:text-6xl leading-tight tracking-tight mb-4 font-bold" style={{ color: "var(--foreground)" }}>{phase.title}</h2>
                {phase.description && (
                  <p className="text-2xl italic" style={{ color: "var(--muted-foreground)" }}>{phase.description}</p>
                )}
              </div>

              <div className="space-y-6">
                {phase.topics.map((topic, tIdx) => {
                  const isExpanded = expandedTopics[topic.id] || false;
                  return (
                    <div key={topic.id} style={{ border: "1px solid var(--border)", background: "var(--card)" }} className="transition-all duration-200 group/topic rounded-lg">
                      <div className="p-6 md:p-8 flex items-center justify-between cursor-pointer" onClick={() => toggleTopic(topic.id)}>
                        <div className="flex items-center gap-6">
                          <div className="w-5 h-5 border-2 rounded transition-colors" style={{ borderColor: "var(--border)" }} />
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "#D9252A", color: "#FFFFFF" }}>M{String(tIdx + 1).padStart(2, "0")}</span>
                              <span className="text-[9px] tracking-widest uppercase" style={{ color: "var(--muted-foreground)" }}>{topic.subtopics.length} TOPICS</span>
                            </div>
                            <h3 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>{topic.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {isEditing && (
                            <div className="opacity-0 group-hover/topic:opacity-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => openModal("EDIT_TOPIC", { targetId: topic.id, initialTitle: topic.title })} className="text-xs px-2 py-1 flex items-center gap-1" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>Edit</button>
                              <button onClick={() => openModal("DELETE_TOPIC", { targetId: topic.id })} className="text-xs px-2 py-1 flex items-center gap-1 transition-colors" style={{ border: "1px solid rgba(217,37,42,0.3)", color: "#D9252A" }}><Trash2 size={12}/></button>
                            </div>
                          )}
                          <div className="w-8 h-8 flex items-center justify-center rounded" style={{ border: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-6 md:p-8" style={{ borderTop: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            {topic.subtopics.map((subtopic) => (
                              <div key={subtopic.id} className="flex items-start gap-3 group/sub">
                                <div className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded" style={{ background: "#D9252A" }} />
                                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{subtopic.title}</span>
                                {isEditing && (
                                  <div className="ml-auto opacity-0 group-hover/sub:opacity-100 flex gap-2">
                                    <button onClick={() => openModal("EDIT_SUBTOPIC", { targetId: subtopic.id, initialTitle: subtopic.title })} className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Edit</button>
                                    <button onClick={() => openModal("DELETE_SUBTOPIC", { targetId: subtopic.id })} className="text-[10px]" style={{ color: "#D9252A" }}>Del</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {isEditing && (
                            <button onClick={() => openModal("ADD_SUBTOPIC", { parentId: topic.id })} className="mt-8 flex items-center gap-2 text-xs font-medium transition-colors" style={{ color: "var(--muted-foreground)" }}>
                              <Plus size={14} /> Add Subtopic
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isEditing && (
                  <button onClick={() => openModal("ADD_TOPIC", { parentId: phase.id })} className="w-full border-2 border-dashed py-6 flex items-center justify-center gap-2 text-sm font-medium transition-all rounded-lg" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                    <Plus size={16} /> Add Topic to {phase.title}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isEditing && (
            <button onClick={() => openModal("ADD_PHASE")} className="w-full py-6 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-all" style={{ background: "var(--foreground)", color: "var(--background)" }}>
              <Plus size={18} /> Create New Phase
            </button>
          )}
        </div>
      </div>

      {modalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8">
              <h3 className="text-2xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
                {modalState.type?.includes("DELETE") ? "Confirm Deletion" : 
                 modalState.type?.includes("EDIT") ? "Edit" : "Create"} 
                {" "}
                {modalState.type?.includes("PHASE") ? "Phase" : 
                 modalState.type?.includes("SUBTOPIC") ? "Subtopic" : "Module"}
              </h3>
              
              {modalState.type?.includes("DELETE") ? (
                <p className="mb-8 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Are you sure you want to delete this {modalState.type?.includes("PHASE") ? "phase and all its underlying modules" : "item"}? This action cannot be undone.
                </p>
              ) : (
                <div className="space-y-5 mb-8">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--muted-foreground)" }}>Title</label>
                    <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-4 py-3 outline-none transition-colors font-medium text-sm rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--secondary-background)", color: "var(--foreground)" }} placeholder="Enter title..." autoFocus />
                  </div>
                  {modalState.type?.includes("PHASE") && !modalState.type?.includes("DELETE") && (
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--muted-foreground)" }}>Description (Optional)</label>
                      <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-4 py-3 outline-none transition-colors font-medium text-sm resize-none h-24 rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--secondary-background)", color: "var(--foreground)" }} placeholder="Enter description..." />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={closeModal} disabled={isSubmitting} className="px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50" style={{ color: "var(--muted-foreground)" }}>Cancel</button>
                <button onClick={handleModalSubmit} disabled={isSubmitting || (!modalState.type?.includes("DELETE") && !formTitle.trim())} className="px-6 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 rounded-lg" style={modalState.type?.includes("DELETE") ? { background: "#D9252A" } : { background: "var(--foreground)" }}>
                  {isSubmitting ? "Saving..." : modalState.type?.includes("DELETE") ? "Delete permanently" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
