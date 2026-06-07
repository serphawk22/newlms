"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Trash2, BookOpen, GraduationCap, ChevronDown } from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";
import { Button } from "@/components/ui/button";

interface Course { id: string; title: string }
interface Student { memberId: string; userId: string; name: string; email: string }
interface Comment {
  id: string; content: string; createdAt: string;
  author: { id: string; name: string };
  student: { id: string; name: string } | null;
}

interface Props { orgId: string; courses: Course[] }
type Tab = "COURSE" | "STUDENT";

export function AdminCommentsPanel({ orgId, courses }: Props) {
  const [tab, setTab] = useState<Tab>("COURSE");
  const [courseId, setCourseId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loadingS, setLoadingS] = useState(false);
  const [loadingC, setLoadingC] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Dropdown UI Open States
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

  const courseRef = useRef<HTMLDivElement>(null);
  const studentRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (courseRef.current && !courseRef.current.contains(event.target as Node)) {
        setCourseDropdownOpen(false);
      }
      if (studentRef.current && !studentRef.current.contains(event.target as Node)) {
        setStudentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load students for the student-comment tab whenever course changes
  useEffect(() => {
    if (tab !== "STUDENT" || !courseId) { setStudents([]); setStudentId(""); return; }
    setStudents([]);
    setStudentId("");
    setLoadingS(true);
    fetch(`/api/admin/students?orgId=${orgId}`)
      .then((r) => r.json())
      .then((d) => { setStudents(d.students ?? []); setLoadingS(false); })
      .catch(() => setLoadingS(false));
  }, [orgId, courseId, tab]);

  // Load comments whenever course/student/tab changes
  useEffect(() => {
    if (!courseId) { setComments([]); return; }
    if (tab === "STUDENT" && !studentId) { setComments([]); return; }

    setLoadingC(true);
    const url = tab === "COURSE"
      ? `/api/admin/comments?courseId=${courseId}&targetType=COURSE`
      : `/api/admin/comments?courseId=${courseId}&targetType=STUDENT&studentId=${studentId}`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => { setComments(d.comments ?? []); setLoadingC(false); })
      .catch(() => { setComments([]); setLoadingC(false); });
  }, [courseId, studentId, tab]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  async function handlePost() {
    if (!text.trim() || !courseId) return;
    if (tab === "STUDENT" && !studentId) return;
    setPosting(true);
    const body: Record<string, string> = { courseId, content: text.trim(), targetType: tab };
    if (tab === "STUDENT") body.studentId = studentId;
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.comment) setComments((prev) => [...prev, data.comment]);
    } catch { /* silent */ }
    setText("");
    setPosting(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/admin/comments?id=${id}&courseId=${courseId}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch { /* silent */ }
    setDeleting(null);
  }

  function handleTabChange(t: Tab) {
    setTab(t);
    setComments([]);
    setStudents([]);
    setStudentId("");
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch { return iso; }
  }

  const selectedCourse = courses.find(c => c.id === courseId);
  const selectedStudent = students.find(s => s.userId === studentId);
  const canPost = !!text.trim() && !!courseId && (tab === "COURSE" || !!studentId) && !posting;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)" }}>
        <span className="text-base font-bold" style={{ color: "var(--foreground)" }}>Admin Comments</span>
        <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>— visible only to admin &amp; instructor / student</span>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["COURSE", "STUDENT"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            suppressHydrationWarning
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors border-b-2"
            style={
              tab === t
                ? { borderColor: "#D9252A", color: "#D9252A", background: "rgba(217,37,42,0.06)" }
                : { borderColor: "transparent", color: "var(--muted-foreground)" }
            }
            onMouseEnter={e => { if (tab !== t) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { if (tab !== t) e.currentTarget.style.background = "transparent"; }}
          >
            {t === "COURSE" ? <BookOpen className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
            {t === "COURSE" ? "Course Comments" : "Student Comments"}
          </button>
        ))}
      </div>

      {/* Selectors */}
      <div className="px-5 py-4 flex flex-wrap gap-3" style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)", zIndex: 10 }}>

        {/* Course selector */}
        <div className="flex-1 min-w-[200px] relative" ref={courseRef}>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Select Course
          </label>
          {courses.length === 0 ? (
            <p style={{ color: "var(--muted-foreground)" }}>No courses in this organization yet.</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
                className="w-full text-sm px-3 py-2 rounded-lg flex items-center justify-between focus:outline-none transition-all"
                style={{
                  background: "var(--card)",
                  border: courseDropdownOpen ? "1px solid #D9252A" : "1px solid var(--border)",
                  color: courseId ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: courseDropdownOpen ? "0 0 0 2px rgba(217,37,42,0.2)" : "none"
                }}
              >
                <span className="truncate">{selectedCourse ? selectedCourse.title : "— Choose a course —"}</span>
                <ChevronDown className={`w-4 h-4 transition-transform text-muted-foreground ${courseDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {courseDropdownOpen && (
                <div
                  className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg shadow-xl border text-sm z-50 animate-in fade-in slide-in-from-top-1 duration-100"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div
                    onClick={() => { setCourseId(""); setStudentId(""); setComments([]); setCourseDropdownOpen(false); }}
                    className="px-3 py-2 cursor-pointer transition-colors"
                    style={{
                      color: !courseId ? "#D9252A" : "var(--foreground)",
                      background: !courseId ? "#FFF1F2" : "transparent"
                    }}
                    onMouseEnter={e => { if (courseId) e.currentTarget.style.backgroundColor = "#FFE4E6"; }}
                    onMouseLeave={e => { if (courseId) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    — Choose a course —
                  </div>
                  {courses.map((c) => {
                    const isSelected = courseId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => { setCourseId(c.id); setStudentId(""); setComments([]); setCourseDropdownOpen(false); }}
                        className="px-3 py-2 cursor-pointer transition-colors truncate"
                        style={{
                          color: isSelected ? "#D9252A" : "var(--foreground)",
                          background: isSelected ? "#FFF1F2" : "transparent"
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "#FFE4E6"; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        {c.title}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Student selector (only for Student Comments tab) */}
        {tab === "STUDENT" && courseId && (
          <div className="flex-1 min-w-[200px] relative" ref={studentRef}>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Select Student
            </label>
            {loadingS ? (
              <div className="flex items-center gap-2 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                <RingLoader size="sm" className="inline-flex" /> Loading students…
              </div>
            ) : students.length === 0 ? (
              <p className="text-xs italic py-2" style={{ color: "var(--muted-foreground)" }}>No students in this workspace yet.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
                  className="w-full text-sm px-3 py-2 rounded-lg flex items-center justify-between focus:outline-none transition-all"
                  style={{
                    background: "var(--card)",
                    border: studentDropdownOpen ? "1px solid #D9252A" : "1px solid var(--border)",
                    color: studentId ? "var(--foreground)" : "var(--muted-foreground)",
                    boxShadow: studentDropdownOpen ? "0 0 0 2px rgba(217,37,42,0.2)" : "none"
                  }}
                >
                  <span className="truncate">
                    {selectedStudent ? `${selectedStudent.name} (${selectedStudent.email})` : "— Choose a student —"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform text-muted-foreground ${studentDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {studentDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg shadow-xl border text-sm z-50 animate-in fade-in slide-in-from-top-1 duration-100"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div
                      onClick={() => { setStudentId(""); setStudentDropdownOpen(false); }}
                      className="px-3 py-2 cursor-pointer transition-colors"
                      style={{
                        color: !studentId ? "#D9252A" : "var(--foreground)",
                        background: !studentId ? "#FFF1F2" : "transparent"
                      }}
                      onMouseEnter={e => { if (studentId) e.currentTarget.style.backgroundColor = "#FFE4E6"; }}
                      onMouseLeave={e => { if (studentId) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      — Choose a student —
                    </div>
                    {students.map((s) => {
                      const isSelected = studentId === s.userId;
                      return (
                        <div
                          key={s.userId}
                          onClick={() => { setStudentId(s.userId); setStudentDropdownOpen(false); }}
                          className="px-3 py-2 cursor-pointer transition-colors truncate"
                          style={{
                            color: isSelected ? "#D9252A" : "var(--foreground)",
                            background: isSelected ? "#FFF1F2" : "transparent"
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "#FFE4E6"; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          {s.name} ({s.email})
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Comments list */}
      <div className="min-h-[180px] max-h-[300px] overflow-y-auto px-5 py-4 space-y-3">
        {!courseId ? (
          <p className="text-center text-sm py-10" style={{ color: "var(--muted-foreground)" }}>Select a course to view comments.</p>
        ) : tab === "STUDENT" && !studentId ? (
          <p className="text-center text-sm py-10" style={{ color: "var(--muted-foreground)" }}>Select a student to view their comments.</p>
        ) : loadingC ? (
          <div className="flex items-center justify-center py-10">
            <RingLoader size="sm" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm py-10" style={{ color: "var(--muted-foreground)" }}>No comments yet — add one below.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(217,37,42,0.12)", border: "1px solid rgba(217,37,42,0.25)" }}
              >
                <span className="text-xs font-black" style={{ color: "#D9252A" }}>
                  {c.author.name?.charAt(0).toUpperCase() ?? "A"}
                </span>
              </div>
              <div className="flex-1 rounded-xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: "var(--foreground)" }}>{c.author.name}</span>
                    {c.student && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                      >
                        → {c.student.name}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{formatDate(c.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    suppressHydrationWarning
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded flex-shrink-0"
                    style={{ color: "#D9252A" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {deleting === c.id
                      ? <RingLoader size="sm" className="inline-flex" />
                      : <Trash2 className="w-3 h-3" />
                    }
                  </button>
                </div>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--foreground)" }}>{c.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
            placeholder={
              !courseId ? "Select a course first…"
                : tab === "STUDENT" && !studentId ? "Select a student first…"
                  : "Write a comment and press Enter…"
            }
            disabled={!courseId || (tab === "STUDENT" && !studentId) || posting}
            suppressHydrationWarning
            className="flex-1 text-sm px-4 py-2 rounded-xl focus:outline-none disabled:opacity-50"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          <Button
            onClick={handlePost}
            disabled={!canPost}
            style={{ background: "#1A1D20", color: "var(--foreground)", border: "1px solid var(--border)" }}
            className="rounded-xl px-4 hover:opacity-80"
          >
            {posting ? <RingLoader size="sm" className="inline-flex" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] mt-2" style={{ color: "var(--muted-foreground)" }}>
          {tab === "COURSE"
            ? "Course comments are visible to admin and the course instructor."
            : "Student comments are visible to admin, course instructor, and that student only."}
        </p>
      </div>
    </div>
  );
}