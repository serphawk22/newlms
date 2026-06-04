"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
<<<<<<< HEAD
import { 
  Users, Search, Download, Plus, Trash2, X, AlertCircle, 
  CheckCircle2, Eye, Check, Ban, GraduationCap, Briefcase, Calendar, Mail
} from "lucide-react";
=======
import { Users, Search, Download, Plus, Trash2, X, AlertCircle, CheckCircle2, Clock } from "lucide-react";
>>>>>>> vaishnavi-ui
import { Loader } from "@/components/ui/loader";
import type { UsersData, StudentRow, InstructorRow, PendingUserRow } from "./page";

interface Props {
  data: UsersData;
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

<<<<<<< HEAD
function UserAvatar({ name, role }: { name: string | null; role: "STUDENT" | "INSTRUCTOR" }) {
=======
function Avatar({ name }: { name: string | null }) {
>>>>>>> vaishnavi-ui
  const initial = (name || "?").charAt(0).toUpperCase();
  const bgClass = role === "STUDENT" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700";
  return (
    <div className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-sm font-medium shrink-0`}>
      {initial}
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
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
  const btnBg = actionVariant === "danger" 
    ? "bg-red-600 hover:bg-red-700" 
    : actionVariant === "success" 
      ? "bg-emerald-600 hover:bg-emerald-700" 
      : "bg-amber-600 hover:bg-amber-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              actionVariant === "danger" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
            }`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{message}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-xs font-medium text-white ${btnBg} rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5`}
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
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <h3 className="text-sm font-semibold text-zinc-900">{label} Added Successfully!</h3>
        </div>
        <div className="border-t border-zinc-200" />
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-2">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Share these credentials with the {label.toLowerCase()}
          </p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">Email</span>
            <span className="text-xs text-zinc-900 font-mono font-medium">{result.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">Temporary Password</span>
            <span className="text-xs text-zinc-900 font-mono font-medium">{result.password}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">Login Code</span>
            <span className="text-xs text-zinc-900 font-mono font-medium">{result.loginCode}</span>
          </div>
        </div>
        <Button
          onClick={handleCopyAll}
          className="w-full h-9 bg-zinc-900 text-white hover:bg-zinc-700 rounded-lg text-sm font-medium"
        >
          {copied ? "Copied!" : "Copy All"}
        </Button>
        <p className="text-xs text-amber-600 text-center">
          ⚠️ Save these credentials now. The password cannot be shown again.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1 h-9 border-zinc-200 text-zinc-700 rounded-lg text-sm"
          >
            Add Another {label}
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 h-9 bg-zinc-900 text-white hover:bg-zinc-700 rounded-lg text-sm"
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
        <div className="flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-700">Name <span className="text-zinc-400 font-normal">(optional)</span></label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${label} name`}
          className="h-10 border-zinc-200 rounded-lg text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-700">Email *</label>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="email@example.com"
          required
          className="h-10 border-zinc-200 rounded-lg text-sm"
        />
      </div>
      <Button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full h-10 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading && <Loader size="sm" variant="bars" />}
        {loading ? "Adding..." : `Add ${label}`}
      </Button>
    </form>
  );
}

<<<<<<< HEAD
export function UsersPageClient({ data }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "students" | "instructors" | "pending" | "approved" | "rejected">("all");
  
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddInstructor, setShowAddInstructor] = useState(false);
  
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    action: "approve" | "reject" | "delete";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
=======
function StudentsTab({ students, onRefresh }: { students: StudentRow[]; onRefresh: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [students, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleRemove = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: removeTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove student");
      }
      setRemoveTarget(null);
      onRefresh();
    } catch {
      setRemoveTarget(null);
    }
    setRemoving(false);
  }, [removeTarget, onRefresh]);

  return (
    <div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Student">
        <AddUserForm role="STUDENT" onClose={() => { setShowAdd(false); onRefresh(); }} onSuccess={() => {}} />
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove Student"
        message={`Are you sure you want to remove "${removeTarget?.name || "Unnamed"}" from this organization?`}
        loading={removing}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 border-zinc-200"
          />
        </div>
        <span className="text-xs text-zinc-500">{filtered.length} students</span>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            className="border-zinc-200 text-zinc-700"
            onClick={() => downloadCSV(studentsToCSV(filtered), "students.csv")}
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button
            className="bg-zinc-900 text-white hover:bg-zinc-700"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Student
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Name</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Email</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Enrolled</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Completed</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Last Login</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Joined</th>
              <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((s) => (
              <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <span className="text-sm font-medium text-zinc-900">{s.name || "Unnamed"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500">{s.email}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{s.enrolledCourses}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{s.completedCourses}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{s.lastLogin}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{s.joinedDate}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setRemoveTarget({ id: s.memberId, name: s.name || "Unnamed" })}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-zinc-500 disabled:opacity-40 hover:text-zinc-900"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-xs text-zinc-500 disabled:opacity-40 hover:text-zinc-900"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function InstructorsTab({ instructors, onRefresh }: { instructors: InstructorRow[]; onRefresh: () => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const filtered = useMemo(() => {
    return instructors.filter((inst) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return inst.name?.toLowerCase().includes(q) || inst.email.toLowerCase().includes(q);
    });
  }, [instructors, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleRemove = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/instructors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: removeTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove instructor");
      }
      setRemoveTarget(null);
      onRefresh();
    } catch {
      setRemoveTarget(null);
    }
    setRemoving(false);
  }, [removeTarget, onRefresh]);

  return (
    <div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Instructor">
        <AddUserForm role="INSTRUCTOR" onClose={() => { setShowAdd(false); onRefresh(); }} onSuccess={() => {}} />
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove Instructor"
        message={`Are you sure you want to remove "${removeTarget?.name || "Unnamed"}" from this organization?`}
        loading={removing}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search instructors..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 border-zinc-200"
          />
        </div>
        <span className="text-xs text-zinc-500">{filtered.length} instructors</span>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            className="border-zinc-200 text-zinc-700"
            onClick={() => downloadCSV(instructorsToCSV(filtered), "instructors.csv")}
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button
            className="bg-zinc-900 text-white hover:bg-zinc-700"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Instructor
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Name</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Email</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Courses</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Students</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Joined</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Last Login</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Status</th>
              <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((inst) => (
              <tr key={inst.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={inst.name} />
                    <span className="text-sm font-medium text-zinc-900">{inst.name || "Unnamed"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500">{inst.email}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{inst.coursesCreated}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{inst.totalStudents}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{inst.joinedDate}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{inst.lastLogin}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    inst.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {inst.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setRemoveTarget({ id: inst.memberId, name: inst.name || "Unnamed" })}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-zinc-500 disabled:opacity-40 hover:text-zinc-900"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-xs text-zinc-500 disabled:opacity-40 hover:text-zinc-900"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function PendingTab({ pendingStudents, pendingInstructors, onRefresh }: {
  pendingStudents: PendingUserRow[];
  pendingInstructors: PendingUserRow[];
  onRefresh: () => void;
}) {
  const allPending = useMemo(() => [...pendingStudents, ...pendingInstructors], [pendingStudents, pendingInstructors]);
  const [approving, setApproving] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return allPending;
    const q = search.toLowerCase();
    return allPending.filter((u) => u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [allPending, search]);

  const handleApprove = useCallback(async (user: PendingUserRow) => {
    setApproving(user.id);
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: user.role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve user");
      }
      onRefresh();
    } catch (err) {
      console.error("Approve failed:", err);
    }
    setApproving(null);
  }, [onRefresh]);

  if (allPending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
        <Clock className="w-10 h-10 mb-3" />
        <p className="text-sm font-medium">No pending requests</p>
        <p className="text-xs mt-1">All signup requests have been reviewed.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search pending users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-zinc-200"
          />
        </div>
        <span className="text-xs text-zinc-500">{filtered.length} pending</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Name</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Email</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Intended Role</th>
              <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <span className="text-sm font-medium text-zinc-900">{u.name || "Unnamed"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    u.role === "STUDENT" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {u.role === "STUDENT" ? "Student" : "Instructor"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleApprove(u)}
                    disabled={approving === u.id}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {approving === u.id && <Loader size="sm" variant="bars" />}
                    {approving === u.id ? "Approving..." : "Approve"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UsersPageClient({ data }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"students" | "instructors" | "pending">("students");
>>>>>>> vaishnavi-ui

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const allUsers = useMemo(() => {
    const students = data.students.map(s => ({ ...s, role: "STUDENT" as const }));
    const instructors = data.instructors.map(i => ({ ...i, role: "INSTRUCTOR" as const }));
    return [...students, ...instructors];
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
            <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-150">
              <UserAvatar name={viewingUser.name} role={viewingUser.role} />
              <div>
                <h4 className="text-sm font-semibold text-zinc-950">{viewingUser.name || "Unnamed"}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${
                    viewingUser.role === "STUDENT" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-purple-50 text-purple-700 border border-purple-100"
                  }`}>
                    {viewingUser.role === "STUDENT" ? <GraduationCap className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                    {viewingUser.role}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    viewingUser.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : 
                    viewingUser.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-red-50 text-red-700 border border-red-100"
                  }`}>
                    {viewingUser.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-600">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{viewingUser.email}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Joined Date: {viewingUser.joinedDate || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600">
                <span className="font-semibold">Last Session Status:</span>
                <span>{viewingUser.lastLogin}</span>
              </div>
              
              <div className="border-t border-zinc-100 pt-3">
                <h5 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] mb-2">Metrics</h5>
                {viewingUser.role === "STUDENT" ? (
                  <div className="grid grid-cols-2 gap-2 text-center bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                    <div>
                      <p className="text-lg font-bold text-zinc-900">{viewingUser.enrolledCourses}</p>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase">Enrolled</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-zinc-900">{viewingUser.completedCourses}</p>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase">Completed</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-center bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                    <div>
                      <p className="text-lg font-bold text-zinc-900">{viewingUser.coursesCreated}</p>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase">Courses Created</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-zinc-900">{viewingUser.totalStudents}</p>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase">Students Taught</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 mt-2">
              {viewingUser.status !== "ACTIVE" && (
                <button
                  onClick={() => setConfirmAction({ userId: viewingUser.id, userName: viewingUser.name || viewingUser.email, action: "approve" })}
                  className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
              )}
              {viewingUser.status === "ACTIVE" && (
                <button
                  onClick={() => setConfirmAction({ userId: viewingUser.id, userName: viewingUser.name || viewingUser.email, action: "reject" })}
                  className="px-3.5 py-2 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" /> Reject
                </button>
              )}
              <button
                onClick={() => setConfirmAction({ userId: viewingUser.id, userName: viewingUser.name || viewingUser.email, action: "delete" })}
                className="px-3.5 py-2 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1"
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
        <Users className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">User Directory</h1>
      </div>

<<<<<<< HEAD
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-zinc-100 rounded-xl p-1 w-fit border border-zinc-200">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              filter === t.id 
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50" 
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label} <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-200/80 text-[10px] text-zinc-600">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 border-zinc-200 bg-white rounded-xl"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
          <Button
            variant="outline"
            className="border-zinc-200 text-zinc-700 rounded-xl"
            onClick={() => downloadCSV(usersToCSV(filteredUsers), "users.csv")}
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button
            variant="outline"
            className="border-zinc-200 text-zinc-700 rounded-xl"
            onClick={() => setShowAddStudent(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Student
          </Button>
          <Button
            className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl"
            onClick={() => setShowAddInstructor(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Instructor
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden rounded-xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-6 py-3.5">User</th>
                <th className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-6 py-3.5">Email</th>
                <th className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-6 py-3.5">Role</th>
                <th className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-6 py-3.5">Status</th>
                <th className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-6 py-3.5">Stats / Details</th>
                <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paged.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.name} role={u.role} />
                      <div>
                        <span className="text-sm font-medium text-zinc-900 block">{u.name || "Unnamed"}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">Joined {u.joinedDate || "N/A"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1 ${
                      u.role === "STUDENT" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-purple-50 text-purple-700 border border-purple-100"
                    }`}>
                      {u.role === "STUDENT" ? <GraduationCap className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                      {u.role.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : 
                      u.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-red-50 text-red-700 border border-red-100"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-600">
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
                        className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {u.status !== "ACTIVE" && (
                        <button
                          onClick={() => setConfirmAction({ userId: u.id, userName: u.name || u.email, action: "approve" })}
                          title="Approve User"
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      
                      {u.status === "ACTIVE" && (
                        <button
                          onClick={() => setConfirmAction({ userId: u.id, userName: u.name || u.email, action: "reject" })}
                          title="Reject User"
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setConfirmAction({ userId: u.id, userName: u.name || u.email, action: "delete" })}
                        title="Delete User"
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 text-sm">
                    No users found matching the filter or query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 bg-zinc-50/50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-semibold text-zinc-500 disabled:opacity-40 hover:text-zinc-900"
            >
              Previous
            </button>
            <span className="text-xs text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs font-semibold text-zinc-500 disabled:opacity-40 hover:text-zinc-900"
            >
              Next
            </button>
          </div>
=======
      <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setTab("students")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "students" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Students ({data.totalStudents})
        </button>
        <button
          onClick={() => setTab("instructors")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "instructors" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Instructors ({data.totalInstructors})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "pending" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Pending ({data.totalPendingStudents + data.totalPendingInstructors})
        </button>
      </div>

      <Card className="border-zinc-200 shadow-sm p-4">
        {tab === "students" ? (
          <StudentsTab students={data.students} onRefresh={handleRefresh} />
        ) : tab === "instructors" ? (
          <InstructorsTab instructors={data.instructors} onRefresh={handleRefresh} />
        ) : (
          <PendingTab
            pendingStudents={data.pendingStudents}
            pendingInstructors={data.pendingInstructors}
            onRefresh={handleRefresh}
          />
>>>>>>> vaishnavi-ui
        )}
      </Card>
    </motion.div>
  );
}