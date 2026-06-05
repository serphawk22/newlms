"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, X } from "lucide-react";
import type { UsersData, StudentUser, InstructorUser } from "./page";

interface Props {
  data: UsersData;
  orgId: string;
}

const ITEMS_PER_PAGE = 15;

function StudentTable({ students }: { students: StudentUser[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [students, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            className="pl-9 focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
          />
        </div>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{filtered.length} students</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] whitespace-nowrap">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Name</th>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Email</th>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Enrolled Courses</th>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Last Login</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((s) => (
              <tr key={s.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.name || "Unnamed"}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{s.email}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{s.enrolledCourses}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{s.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs disabled:opacity-40"
            style={{ color: "var(--muted-foreground)" }}
          >
            Previous
          </button>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-xs disabled:opacity-40"
            style={{ color: "var(--muted-foreground)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function InstructorTable({ instructors, orgId }: { instructors: InstructorUser[]; orgId: string }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return instructors.filter((inst) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return inst.name?.toLowerCase().includes(q) || inst.email.toLowerCase().includes(q);
    });
  }, [instructors, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), orgId }),
      });
      setNewName("");
      setNewEmail("");
      setShowAdd(false);
      window.location.reload();
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          <Input
            placeholder="Search instructors..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            className="pl-9 focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
          />
        </div>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{filtered.length} instructors</span>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          style={{ background: "#D9252A", color: "#FFFFFF" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
          className="text-sm"
        >
          {showAdd ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showAdd ? "Cancel" : "Add Instructor"}
        </Button>
      </div>

      {showAdd && (
        <Card className="p-4 mb-4" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              className="flex-1 focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
            />
            <Input
              placeholder="Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              className="flex-1 focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
            />
            <Button
              onClick={handleAdd}
              disabled={adding || !newEmail.trim()}
              style={{ background: "#D9252A", color: "#FFFFFF" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
            >
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] whitespace-nowrap">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Name</th>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Email</th>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Courses Created</th>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Students</th>
              <th className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-3" style={{ color: "var(--muted-foreground)" }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((inst) => (
              <tr key={inst.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--foreground)" }}>{inst.name || "Unnamed"}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{inst.email}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{inst.coursesCreated}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{inst.studentsCount}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{inst.joinedDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs disabled:opacity-40"
            style={{ color: "var(--muted-foreground)" }}
          >
            Previous
          </button>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-xs disabled:opacity-40"
            style={{ color: "var(--muted-foreground)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export function UsersPageClient({ data, orgId }: Props) {
  const [tab, setTab] = useState<"students" | "instructors">("students");

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Users</h1>
      </div>

      <div className="flex gap-1 rounded-lg p-0.5 w-fit" style={{ background: "var(--secondary-background)" }}>
        <button
          onClick={() => setTab("students")}
          className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          style={tab === "students" ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "none" } : { background: "transparent", color: "var(--muted-foreground)" }}
        >
          Students ({data.totalStudents})
        </button>
        <button
          onClick={() => setTab("instructors")}
          className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          style={tab === "instructors" ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "none" } : { background: "transparent", color: "var(--muted-foreground)" }}
        >
          Instructors ({data.totalInstructors})
        </button>
      </div>

      <Card className="overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
        {tab === "students" ? (
          <StudentTable students={data.students} />
        ) : (
          <InstructorTable instructors={data.instructors} orgId={orgId} />
        )}
      </Card>
    </div>
  );
}
