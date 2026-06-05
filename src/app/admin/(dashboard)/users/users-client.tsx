"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, Search, Download, Plus, Trash2, X, AlertCircle, 
  CheckCircle2, Eye, Check, Ban, GraduationCap, Briefcase, Calendar, Mail
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import type { UsersData, StudentRow, InstructorRow, PendingUserRow } from "./page";

interface Props {
  data: UsersData;
  defaultFilter?: "all" | "students" | "instructors";
}

const ITEMS_PER_PAGE = 10;

function csvEscape(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

function usersToCSV(rows: any[]): string {
  const header = "Name,Email,Role,Status,Joined Date,Last Login,Details";
  const lines = rows.map((r) =>
    [
      csvEscape(r.name || "Unnamed"),
      csvEscape(r.email),
      csvEscape(r.role),
      csvEscape(r.status),
      csvEscape(r.joinedDate || "N/A"),
      csvEscape(r.lastLogin || "N/A"),
      r.role === "STUDENT" 
        ? csvEscape(`${r.enrolledCourses} enrolled, ${r.completedCourses} completed`)
        : csvEscape(`${r.coursesCreated} courses created, ${r.totalStudents} total students`)
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function UserAvatar({ name, role }: { name: string | null; role: "STUDENT" | "INSTRUCTOR" }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A" }}>
      {initial}
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-xl w-full max-w-md mx-4 overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{title}</h2>
          <button onClick={onClose} className="transition-colors" style={{ color: "var(--muted-foreground)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading, actionLabel = "Remove", actionVariant = "danger" }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; loading: boolean;
  actionLabel?: string; actionVariant?: "danger" | "success" | "warning";
}) {
  if (!open) return null;

  const alertBg = "rgba(217,37,42,0.12)";
  const alertColor = "#D9252A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-xl w-full max-w-sm mx-4" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: alertBg, color: alertColor }}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{title}</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{message}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "var(--secondary-background)", color: "var(--muted-foreground)" }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: "#D9252A" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
            >
              {loading && <Loader size="sm" variant="bars" />}
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddUserForm({ role, onClose, onSuccess }: { role: "STUDENT" | "INSTRUCTOR"; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ password?: string; loginCode?: string; email?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${role === "STUDENT" ? "students" : "instructors"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add user");
      setResult(data);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  }, [name, email, role, onSuccess]);

  const handleCopyAll = useCallback(async () => {
    if (!result) return;
    const text = `Email: ${result.email}\nPassword: ${result.password}\nLogin Code: ${result.loginCode}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(null);
    setName("");
    setEmail("");
    setCopied(false);
  }, []);

  const label = role === "STUDENT" ? "Student" : "Instructor";

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2 pt-2">
          <CheckCircle2 className="w-10 h-10" style={{ color: "#D9252A" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{label} Added Successfully!</h3>
        </div>
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <div className="rounded-lg p-4 space-y-2" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
            Share these credentials with the {label.toLowerCase()}
          </p>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Email</span>
            <span className="text-xs font-mono font-medium" style={{ color: "var(--foreground)" }}>{result.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Temporary Password</span>
            <span className="text-xs font-mono font-medium" style={{ color: "var(--foreground)" }}>{result.password}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Login Code</span>
            <span className="text-xs font-mono font-medium" style={{ color: "var(--foreground)" }}>{result.loginCode}</span>
          </div>
        </div>
        <Button
          onClick={handleCopyAll}
          className="w-full h-9 rounded-lg text-sm font-medium"
          style={{ background: "#D9252A", color: "#FFFFFF" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
        >
          {copied ? "Copied!" : "Copy All"}
        </Button>
        <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
          Save these credentials now. The password cannot be shown again.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleReset}
            className="flex-1 h-9 rounded-lg text-sm"
            style={{ background: "var(--secondary-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            Add Another {label}
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg text-sm"
            style={{ background: "#D9252A", color: "#FFFFFF" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 text-sm rounded-lg" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Name <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>(optional)</span></label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${label} name`}
          className="h-10 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
          style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Email *</label>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="email@example.com"
          required
          className="h-10 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
          style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />
      </div>
      <Button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full h-10 rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ background: "#D9252A", color: "#FFFFFF" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
      >
        {loading && <Loader size="sm" variant="bars" />}
        {loading ? "Adding..." : `Add ${label}`}
      </Button>
    </form>
  );
}

export function UsersPageClient({ data, defaultFilter = "all" }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "students" | "instructors" | "pending" | "approved" | "rejected">(defaultFilter);
  
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddInstructor, setShowAddInstructor] = useState(false);
  
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    action: "approve" | "reject" | "delete";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const allUsers = useMemo(() => {
    const students = data.students.map(s => ({ ...s, role: "STUDENT" as const }));
    const instructors = data.instructors.map(i => ({ ...i, role: "INSTRUCTOR" as const }));
    const pendingS = data.pendingStudents.map(p => ({
      id: p.id, memberId: p.id, name: p.name, email: p.email,
      enrolledCourses: 0, completedCourses: 0, lastLogin: "N/A", joinedDate: "N/A",
      status: p.status, loginCode: p.loginCode, role: "STUDENT" as const,
    }));
    const pendingI = data.pendingInstructors.map(p => ({
      id: p.id, memberId: p.id, name: p.name, email: p.email,
      coursesCreated: 0, totalStudents: 0, lastLogin: "N/A", joinedDate: "N/A",
      status: p.status, loginCode: p.loginCode, role: "INSTRUCTOR" as const,
    }));
    return [...students, ...instructors, ...pendingS, ...pendingI];
  }, [data]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchesSearch = !search || 
        (u.name && u.name.toLowerCase().includes(search.toLowerCase())) || 
        u.email.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === "students") return u.role === "STUDENT";
      if (filter === "instructors") return u.role === "INSTRUCTOR";
      if (filter === "pending") return u.status === "PENDING";
      if (filter === "approved") return u.status === "ACTIVE";
      if (filter === "rejected") return u.status === "REJECTED";
      return true;
    });
  }, [allUsers, filter, search]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paged = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleStatusUpdate = async (userId: string, newStatus: "ACTIVE" | "REJECTED") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setConfirmAction(null);
      if (viewingUser && viewingUser.id === userId) {
        setViewingUser({ ...viewingUser, status: newStatus });
      }
      handleRefresh();
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setConfirmAction(null);
      setViewingUser(null);
      handleRefresh();
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const handleActionConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.action === "approve") {
      handleStatusUpdate(confirmAction.userId, "ACTIVE");
    } else if (confirmAction.action === "reject") {
      handleStatusUpdate(confirmAction.userId, "REJECTED");
    } else if (confirmAction.action === "delete") {
      handleDeleteUser(confirmAction.userId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page space-y-6"
    >
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleActionConfirm}
        title={`${confirmAction?.action === "approve" ? "Approve User" : confirmAction?.action === "reject" ? "Reject User" : "Delete User"}`}
        message={`Are you sure you want to ${confirmAction?.action} ${confirmAction?.userName || "this user"}?`}
        loading={actionLoading}
        actionLabel={confirmAction?.action === "approve" ? "Approve" : confirmAction?.action === "reject" ? "Reject" : "Delete"}
        actionVariant={confirmAction?.action === "approve" ? "success" : confirmAction?.action === "reject" ? "warning" : "danger"}
      />

      <Modal open={!!viewingUser} onClose={() => setViewingUser(null)} title="User Details">
        {viewingUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
              <UserAvatar name={viewingUser.name} role={viewingUser.role} />
              <div>
                <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{viewingUser.name || "Unnamed"}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
                    {viewingUser.role === "STUDENT" ? <GraduationCap className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                    {viewingUser.role}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
                    {viewingUser.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
                <Mail className="w-4 h-4 shrink-0" />
                <span>{viewingUser.email}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Joined Date: {viewingUser.joinedDate || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
                <span className="font-semibold">Last Session Status:</span>
                <span>{viewingUser.lastLogin}</span>
              </div>
              
              <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <h5 className="font-bold uppercase tracking-wider text-[10px] mb-2" style={{ color: "var(--muted-foreground)" }}>Metrics</h5>
                {viewingUser.role === "STUDENT" ? (
                  <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-lg" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{viewingUser.enrolledCourses}</p>
                      <p className="text-[10px] font-medium uppercase" style={{ color: "var(--muted-foreground)" }}>Enrolled</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{viewingUser.completedCourses}</p>
                      <p className="text-[10px] font-medium uppercase" style={{ color: "var(--muted-foreground)" }}>Completed</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-lg" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{viewingUser.coursesCreated}</p>
                      <p className="text-[10px] font-medium uppercase" style={{ color: "var(--muted-foreground)" }}>Courses Created</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{viewingUser.totalStudents}</p>
                      <p className="text-[10px] font-medium uppercase" style={{ color: "var(--muted-foreground)" }}>Students Taught</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
              {viewingUser.status !== "ACTIVE" && (
                <button
                  onClick={() => setConfirmAction({ userId: viewingUser.id, userName: viewingUser.name || viewingUser.email, action: "approve" })}
                  className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1"
                  style={{ background: "#D9252A" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
              )}
              {viewingUser.status === "ACTIVE" && (
                <button
                  onClick={() => setConfirmAction({ userId: viewingUser.id, userName: viewingUser.name || viewingUser.email, action: "reject" })}
                  className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1"
                  style={{ background: "#D9252A" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
                >
                  <Ban className="w-3.5 h-3.5" /> Reject
                </button>
              )}
              <button
                onClick={() => setConfirmAction({ userId: viewingUser.id, userName: viewingUser.name || viewingUser.email, action: "delete" })}
                className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1"
                style={{ background: "#D9252A" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAddStudent} onClose={() => setShowAddStudent(false)} title="Add Student">
        <AddUserForm role="STUDENT" onClose={() => { setShowAddStudent(false); handleRefresh(); }} onSuccess={() => {}} />
      </Modal>

      <Modal open={showAddInstructor} onClose={() => setShowAddInstructor(false)} title="Add Instructor">
        <AddUserForm role="INSTRUCTOR" onClose={() => { setShowAddInstructor(false); handleRefresh(); }} onSuccess={() => {}} />
      </Modal>

      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>User Directory</h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl p-1 w-fit" style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}>
        {[
          { id: "all", label: "All Users", count: allUsers.length },
          { id: "students", label: "Students", count: allUsers.filter(u => u.role === "STUDENT").length },
          { id: "instructors", label: "Instructors", count: allUsers.filter(u => u.role === "INSTRUCTOR").length },
          { id: "pending", label: "Pending Approval", count: allUsers.filter(u => u.status === "PENDING").length },
          { id: "approved", label: "Approved (Active)", count: allUsers.filter(u => u.status === "ACTIVE").length },
          { id: "rejected", label: "Rejected", count: allUsers.filter(u => u.status === "REJECTED").length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setFilter(t.id as any); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={filter === t.id ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "none", border: "1px solid var(--border)" } : { background: "transparent", color: "var(--muted-foreground)" }}
          >
            {t.label} <span className="ml-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A" }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 rounded-xl focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
            style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
          <Button
            className="rounded-xl"
            style={{ background: "var(--secondary-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            onClick={() => downloadCSV(usersToCSV(filteredUsers), "users.csv")}
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button
            className="rounded-xl"
            style={{ background: "var(--secondary-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            onClick={() => setShowAddStudent(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Student
          </Button>
          <Button
            className="rounded-xl"
            style={{ background: "#D9252A", color: "#FFFFFF" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
            onClick={() => setShowAddInstructor(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Instructor
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                <th className="text-[10px] font-bold uppercase tracking-widest px-6 py-3.5" style={{ color: "var(--muted-foreground)" }}>User</th>
                <th className="text-[10px] font-bold uppercase tracking-widest px-6 py-3.5" style={{ color: "var(--muted-foreground)" }}>Email</th>
                <th className="text-[10px] font-bold uppercase tracking-widest px-6 py-3.5" style={{ color: "var(--muted-foreground)" }}>Role</th>
                <th className="text-[10px] font-bold uppercase tracking-widest px-6 py-3.5" style={{ color: "var(--muted-foreground)" }}>Status</th>
                <th className="text-[10px] font-bold uppercase tracking-widest px-6 py-3.5" style={{ color: "var(--muted-foreground)" }}>Stats / Details</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-3.5" style={{ color: "var(--muted-foreground)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => (
                <tr key={u.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.name} role={u.role} />
                      <div>
                        <span className="text-sm font-medium block" style={{ color: "var(--foreground)" }}>{u.name || "Unnamed"}</span>
                        <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>Joined {u.joinedDate || "N/A"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: "var(--muted-foreground)" }}>{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
                      {u.role === "STUDENT" ? <GraduationCap className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                      {u.role.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {u.role === "STUDENT" ? (
                      <span>{u.enrolledCourses} enrolled • {u.completedCourses} completed</span>
                    ) : (
                      <span>{u.coursesCreated} created • {u.totalStudents} students</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setViewingUser(u)}
                        title="View details"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {u.status !== "ACTIVE" && (
                        <button
                          onClick={() => setConfirmAction({ userId: u.id, userName: u.name || u.email, action: "approve" })}
                          title="Approve User"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "#D9252A" }}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      
                      {u.status === "ACTIVE" && (
                        <button
                          onClick={() => setConfirmAction({ userId: u.id, userName: u.name || u.email, action: "reject" })}
                          title="Reject User"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "#D9252A" }}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setConfirmAction({ userId: u.id, userName: u.name || u.email, action: "delete" })}
                        title="Delete User"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "#D9252A" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    No users found matching the filter or query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--border)", background: "var(--secondary-background)" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-semibold disabled:opacity-40"
              style={{ color: "var(--muted-foreground)" }}
            >
              Previous
            </button>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs font-semibold disabled:opacity-40"
              style={{ color: "var(--muted-foreground)" }}
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}