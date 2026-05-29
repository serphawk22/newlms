"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
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

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"] });

type Subtopic = { id: string; title: string; order: number; progress?: any[] };
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

  // Sync state with server prop on router.refresh()
  React.useEffect(() => {
    if (initialRoadmap) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhases((prev) => {
        // Simple heuristic: if lengths differ or it's a new instance, update it
        if (JSON.stringify(prev) !== JSON.stringify(initialRoadmap.phases)) {
          return initialRoadmap.phases;
        }
        return prev;
      });
    }
  }, [initialRoadmap]);

  // Modal State
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

  const openModal = (type: ModalType, payload?: any) => {
    setModalState({ isOpen: true, type, ...payload });
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
    } catch (e) {
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Drag and Drop (Phases)
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
    <div className="bg-[#F5F5F0] text-[#111] font-sans selection:bg-black selection:text-white rounded-xl overflow-hidden relative">
      
      <div className="relative bg-white min-h-[600px]">
        {/* TOP NAV BAR */}
        <div className="border-b border-[#E0E0DB] bg-white/80 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
             <h2 className={`${playfair.className} text-2xl font-bold`}>Interactive Syllabus</h2>
             <p className="text-sm text-black/50">Manage the course learning path and track student progress.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`${jetbrains.className} text-[10px] uppercase tracking-widest font-bold ${isEditing ? "bg-red-50 text-red-600 border-red-200" : "bg-black text-white border-black"} border px-4 py-2 hover:opacity-80 transition-all`}
            >
              {isEditing ? "Disable Edit Mode" : "Enable Edit Mode"}
            </button>
          </div>
        </div>

        <div className="p-8 md:p-12 max-w-4xl mx-auto pb-16">
          
          {phases.length === 0 && (
            <div className="text-center py-20 border border-dashed border-black/20">
              <p className={`${playfair.className} text-2xl text-black/50 mb-4`}>No Roadmap Found</p>
              {isEditing && (
                <button onClick={() => openModal("ADD_PHASE")} className="bg-black text-white px-6 py-2 rounded-none text-sm hover:bg-black/80 transition-colors">
                  Create First Phase
                </button>
              )}
            </div>
          )}

          {phases.map((phase, pIdx) => (
            <div 
              key={phase.id} 
              className="mb-24 relative"
              draggable={isEditing}
              onDragStart={(e) => handlePhaseDragStart(e, pIdx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handlePhaseDrop(e, pIdx)}
            >
              {/* PHASE HEADER */}
              <div className="mb-12 group">
                <div className="flex items-center gap-4 mb-4">
                  {isEditing && (
                    <div className="cursor-move text-black/20 hover:text-black transition-colors" title="Drag to reorder phase">
                      <GripVertical size={20} />
                    </div>
                  )}
                  <span className={`${jetbrains.className} bg-[#104FE8] text-white text-[10px] tracking-widest font-bold px-3 py-1 uppercase`}>
                    PHASE {String(pIdx + 1).padStart(2, "0")}
                  </span>
                  <span className={`${jetbrains.className} text-[10px] text-black/40 tracking-widest uppercase`}>
                    // {phase.topics.length} MODULES
                  </span>
                  
                  {isEditing && (
                    <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal("EDIT_PHASE", { targetId: phase.id, initialTitle: phase.title, initialDesc: phase.description })} className="text-xs border border-black/20 px-2 py-1 hover:bg-black/5 flex items-center gap-1"><Edit2 size={12}/> Edit</button>
                      <button onClick={() => openModal("DELETE_PHASE", { targetId: phase.id })} className="text-xs border border-red-200 text-red-500 px-2 py-1 hover:bg-red-50 flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                    </div>
                  )}
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
                  return (
                    <div key={topic.id} className="border border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 transition-all duration-200 group/topic">
                      
                      {/* TOPIC HEADER */}
                      <div className="p-6 md:p-8 flex items-center justify-between cursor-pointer" onClick={() => toggleTopic(topic.id)}>
                        <div className="flex items-center gap-6">
                          <div className="w-5 h-5 border-2 border-black/20 group-hover/topic:border-black transition-colors" />
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`${jetbrains.className} bg-[#104FE8] text-white text-[10px] font-bold px-2 py-0.5`}>
                                M{String(tIdx + 1).padStart(2, "0")}
                              </span>
                              <span className={`${jetbrains.className} text-[9px] text-black/40 tracking-widest uppercase`}>
                                {topic.subtopics.length} TOPICS
                              </span>
                            </div>
                            <h3 className={`${playfair.className} text-3xl text-black`}>{topic.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {isEditing && (
                            <div className="opacity-0 group-hover/topic:opacity-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => openModal("EDIT_TOPIC", { targetId: topic.id, initialTitle: topic.title })} className="text-xs border border-black/20 px-2 py-1 flex items-center gap-1 hover:bg-black/5">Edit</button>
                              <button onClick={() => openModal("DELETE_TOPIC", { targetId: topic.id })} className="text-xs border border-red-200 text-red-500 px-2 py-1 flex items-center gap-1 hover:bg-red-50"><Trash2 size={12}/></button>
                            </div>
                          )}
                          <div className="w-8 h-8 border border-black flex items-center justify-center bg-[#F5F5F0]">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* SUBTOPICS */}
                      {isExpanded && (
                        <div className="border-t border-black p-6 md:p-8 bg-[#FDFDFD]">
                          <p className={`${jetbrains.className} text-[10px] text-black/40 tracking-widest uppercase mb-6`}>
                            // TOPICS
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            {topic.subtopics.map((subtopic) => (
                              <div key={subtopic.id} className="flex items-start gap-3 group/sub">
                                <div className="mt-1.5 w-1.5 h-1.5 bg-[#104FE8] shrink-0" />
                                <span className="text-sm font-medium text-black/80">{subtopic.title}</span>
                                {isEditing && (
                                  <div className="ml-auto opacity-0 group-hover/sub:opacity-100 flex gap-2">
                                     <button onClick={() => openModal("EDIT_SUBTOPIC", { targetId: subtopic.id, initialTitle: subtopic.title })} className="text-[10px] text-black/50 hover:text-black">Edit</button>
                                     <button onClick={() => openModal("DELETE_SUBTOPIC", { targetId: subtopic.id })} className="text-[10px] text-red-400 hover:text-red-600">Del</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {isEditing && (
                            <button 
                              onClick={() => openModal("ADD_SUBTOPIC", { parentId: topic.id })}
                              className="mt-8 flex items-center gap-2 text-xs font-medium text-black/50 hover:text-black transition-colors"
                            >
                              <Plus size={14} /> Add Subtopic
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {isEditing && (
                  <button 
                    onClick={() => openModal("ADD_TOPIC", { parentId: phase.id })}
                    className="w-full border-2 border-dashed border-black/20 py-6 flex items-center justify-center gap-2 text-sm font-medium text-black/50 hover:text-black hover:border-black/50 hover:bg-black/5 transition-all"
                  >
                    <Plus size={16} /> Add Topic to {phase.title}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* ADD PHASE BUTTON */}
          {isEditing && (
            <button 
              onClick={() => openModal("ADD_PHASE")}
              className="w-full bg-black text-white py-6 flex items-center justify-center gap-2 text-sm font-medium hover:bg-black/80 shadow-[6px_6px_0px_0px_rgba(16,79,232,1)] hover:shadow-[2px_2px_0px_0px_rgba(16,79,232,1)] hover:translate-y-1 hover:translate-x-1 transition-all"
            >
              <Plus size={18} /> Create New Phase
            </button>
          )}
        </div>
      </div>

      {/* CUSTOM MODAL */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-black/10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8">
              <h3 className={`${playfair.className} text-2xl font-bold mb-6 text-black tracking-tight`}>
                {modalState.type?.includes("DELETE") ? "Confirm Deletion" : 
                 modalState.type?.includes("EDIT") ? "Edit" : "Create"} 
                {" "}
                {modalState.type?.includes("PHASE") ? "Phase" : 
                 modalState.type?.includes("SUBTOPIC") ? "Subtopic" : "Module"}
              </h3>
              
              {modalState.type?.includes("DELETE") ? (
                <p className="text-black/60 mb-8 text-sm">
                  Are you sure you want to delete this {modalState.type?.includes("PHASE") ? "phase and all its underlying modules" : "item"}? This action cannot be undone.
                </p>
              ) : (
                <div className="space-y-5 mb-8">
                  <div>
                    <label className={`${jetbrains.className} block text-[10px] font-bold tracking-widest uppercase text-black/50 mb-2`}>Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full border-2 border-black/10 rounded-none px-4 py-3 outline-none focus:border-black transition-colors font-medium text-sm"
                      placeholder="Enter title..."
                      autoFocus
                    />
                  </div>
                  {modalState.type?.includes("PHASE") && !modalState.type?.includes("DELETE") && (
                    <div>
                      <label className={`${jetbrains.className} block text-[10px] font-bold tracking-widest uppercase text-black/50 mb-2`}>Description (Optional)</label>
                      <textarea
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        className="w-full border-2 border-black/10 rounded-none px-4 py-3 outline-none focus:border-black transition-colors font-medium text-sm resize-none h-24"
                        placeholder="Enter description..."
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button 
                  onClick={closeModal} 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-medium text-black/60 hover:bg-black/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleModalSubmit}
                  disabled={isSubmitting || (!modalState.type?.includes("DELETE") && !formTitle.trim())}
                  className={`px-6 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 ${modalState.type?.includes("DELETE") ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-black/80"}`}
                >
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
