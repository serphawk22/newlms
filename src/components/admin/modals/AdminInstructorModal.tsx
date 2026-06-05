"use client";
import { useEffect, useState } from "react";
import { X, Trash2, UserCheck, Plus } from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";
import { Button } from "@/components/ui/button";

interface Instructor {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  coursesCreated: number;
}

interface Props {
  orgId: string;
  onClose: () => void;
}

export function AdminInstructorModal({ orgId, onClose }: Props) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [deleting, setDeleting]       = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/instructors?orgId=${orgId}`);
    const data = await res.json();
    setInstructors(data.instructors ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [orgId]);

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`Remove "${name}" from the workspace as Instructor?`)) return;
    setDeleting(memberId);
    await fetch("/api/admin/instructors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, orgId }),
    });
    setDeleting(null);
    setInstructors((prev) => prev.filter((i) => i.memberId !== memberId));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");
    if (!addEmail.trim()) { setAddError("Email is required"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), email: addEmail.trim(), orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add instructor");
      const pwdMsg = data.password ? ` Password: ${data.password}` : " (already had an account)";
      setAddSuccess(`Instructor added successfully!${pwdMsg}`);
      setAddName("");
      setAddEmail("");
      setShowAdd(false);
      load();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#D9252A]" />
            <h2 className="text-base font-bold text-slate-900">Instructor Directory</h2>
            {!loading && (
              <span className="text-xs bg-[rgba(217,37,42,0.08)] text-[#D9252A] px-2 py-0.5 rounded-full font-bold ml-1">
                {instructors.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="px-6 py-4 border-b border-slate-100 bg-[rgba(217,37,42,0.04)]">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Instructor name"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(217,37,42,0.25)] focus:border-[#D9252A]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="instructor@example.com"
                  required
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(217,37,42,0.25)] focus:border-[#D9252A]"
                />
              </div>
              <Button type="submit" disabled={adding} className="h-10 px-5 bg-[#D9252A] hover:bg-[#C21F24] text-white text-sm font-medium rounded-lg">
                {adding ? <RingLoader size="sm" className="inline-flex" /> : "Add"}
              </Button>
            </div>
            {addError && <p className="text-xs text-red-600 mt-2">{addError}</p>}
            {addSuccess && <p className="text-xs text-emerald-600 mt-2">{addSuccess}</p>}
          </form>
        )}

        {/* Body */}
        <div className="max-h-[440px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RingLoader size="md" />
            </div>
          ) : instructors.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-16">No instructors in this workspace yet.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
              <thead className="sticky top-0 z-10" style={{ background: "var(--secondary-background)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Name</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Email</th>
                  <th className="text-center py-3 px-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Courses</th>
                  <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-right" style={{ color: "var(--muted-foreground)" }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((i) => (
                  <tr key={i.memberId} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="py-3 px-5 text-sm font-medium" style={{ color: "var(--foreground)" }}>{i.name}</td>
                    <td className="py-3 px-4 text-sm" style={{ color: "var(--muted-foreground)" }}>{i.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        {i.coursesCreated}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(i.memberId, i.name)}
                        disabled={deleting === i.memberId}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === i.memberId
                          ? <RingLoader size="sm" className="inline-flex" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowAdd(!showAdd); setAddError(""); setAddSuccess(""); }}
            className="text-slate-600"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {showAdd ? "Cancel" : "Add Instructor"}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="text-slate-600">Close</Button>
        </div>
      </div>
    </div>
  );
}
