"use client";

import { motion } from "framer-motion";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Download, Plus, Trash2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import type { UsersData, StudentRow, InstructorRow } from "./page";

interface Props {
  data: UsersData;
}

const ITEMS_PER_PAGE = 10;

function csvEscape(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

function studentsToCSV(rows: StudentRow[]): string {
  const header = "Name,Email,Enrolled Courses,Completed Courses,Last Login,Joined Date";
  const lines = rows.map((r) =>
    [
      csvEscape(r.name || "Unnamed"),
      csvEscape(r.email),
      r.enrolledCourses,
      r.completedCourses,
      csvEscape(r.lastLogin),
      csvEscape(r.joinedDate),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

function instructorsToCSV(rows: InstructorRow[]): string {
  const header = "Name,Email,Courses Created,Total Students,Joined Date,Last Login,Status";
  const lines = rows.map((r) =>
    [
      csvEscape(r.name || "Unnamed"),
      csvEscape(r.email),
      r.coursesCreated,
      r.totalStudents,
      csvEscape(r.joinedDate),
      csvEscape(r.lastLogin),
      csvEscape(r.status),
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

function StudentAvatar({ name }: { name: string | null }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600 shrink-0">
      {initial}
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
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
              className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader size="sm" variant="bars" />}
              {loading ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddUserForm({ role, onClose, onSuccess }: { role: "STUDENT" | "INSTRUCTOR"; onClose: () => void; onSuccess: () => void }) {
  const router = useRouter();
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
                    <StudentAvatar name={s.name} />
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
                    <StudentAvatar name={inst.name} />
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

export function UsersPageClient({ data }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"students" | "instructors">("students");

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page space-y-6"
    >
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Users</h1>
      </div>

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
      </div>

      <Card className="border-zinc-200 shadow-sm p-4">
        {tab === "students" ? (
          <StudentsTab students={data.students} onRefresh={handleRefresh} />
        ) : (
          <InstructorsTab instructors={data.instructors} onRefresh={handleRefresh} />
        )}
      </Card>
    </motion.div>
  );
}
