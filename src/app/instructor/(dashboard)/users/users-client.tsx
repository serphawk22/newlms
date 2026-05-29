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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 border-zinc-200"
          />
        </div>
        <span className="text-xs text-zinc-500">{filtered.length} students</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Name</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Email</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Enrolled Courses</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((s) => (
              <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-zinc-900">{s.name || "Unnamed"}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{s.email}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{s.enrolledCourses}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{s.lastLogin}</td>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search instructors..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 border-zinc-200"
          />
        </div>
        <span className="text-xs text-zinc-500">{filtered.length} instructors</span>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-zinc-900 text-white hover:bg-zinc-800 text-sm"
        >
          {showAdd ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showAdd ? "Cancel" : "Add Instructor"}
        </Button>
      </div>

      {showAdd && (
        <Card className="border-zinc-200 shadow-sm p-4 mb-4 bg-zinc-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border-zinc-200 flex-1"
            />
            <Input
              placeholder="Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="border-zinc-200 flex-1"
            />
            <Button
              onClick={handleAdd}
              disabled={adding || !newEmail.trim()}
              className="bg-zinc-900 text-white hover:bg-zinc-800"
            >
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Name</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Email</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Courses Created</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Students</th>
              <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((inst) => (
              <tr key={inst.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-zinc-900">{inst.name || "Unnamed"}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{inst.email}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{inst.coursesCreated}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{inst.studentsCount}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{inst.joinedDate}</td>
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

export function UsersPageClient({ data, orgId }: Props) {
  const [tab, setTab] = useState<"students" | "instructors">("students");

  return (
    <div className="container-page space-y-6">
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

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        {tab === "students" ? (
          <StudentTable students={data.students} />
        ) : (
          <InstructorTable instructors={data.instructors} orgId={orgId} />
        )}
      </Card>
    </div>
  );
}
