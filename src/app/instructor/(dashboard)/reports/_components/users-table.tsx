"use client";

import { Fragment, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Download, Loader2, Plus, Search, X } from "lucide-react";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  registeredAt: string;
  enrolledCourses: { title: string; progress: number }[];
}

interface UsersTableProps {
  users: UserRow[];
  orgId: string;
}

export function UsersTable({ users, orgId }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortKey, setSortKey] = useState<keyof UserRow>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"STUDENT" | "INSTRUCTOR">("STUDENT");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const perPage = 10;

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    if (filter === "active") result = result.filter((u) => u.coursesEnrolled > 0);
    if (filter === "inactive") result = result.filter((u) => u.coursesEnrolled === 0);

    result.sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [users, search, filter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageUsers = filtered.slice(page * perPage, (page + 1) * perPage);

  const toggleSort = (key: keyof UserRow) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const roleColor = (role: string) => {
    if (role === "ADMIN") return "bg-violet-100 text-violet-700";
    if (role === "INSTRUCTOR") return "bg-blue-100 text-blue-700";
    return "bg-emerald-100 text-emerald-700";
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");
    if (!addEmail.trim()) { setAddError("Email is required"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/instructor/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), email: addEmail.trim(), role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add user");
      const pwdMsg = data.password ? ` Password: ${data.password}` : " (already had an account)";
      setAddSuccess(`User added successfully!${pwdMsg}`);
      setAddName("");
      setAddEmail("");
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  const exportCSV = () => {
    const header = "Name,Email,Role,Courses Enrolled,Courses Completed,Registration Date";
    const rows = filtered.map((u) =>
      `"${u.name || ""}","${u.email}","${u.role}",${u.coursesEnrolled},${u.coursesCompleted},"${u.registeredAt}"`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const initials = (name: string | null) =>
    (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "all" || value === "active" || value === "inactive") {
              setFilter(value);
            }
            setPage(0);
          }}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={exportCSV}
          data-export-csv
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
        <button
          onClick={() => { setShowAdd(!showAdd); setAddError(""); setAddSuccess(""); }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors ml-auto"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? "Cancel" : "Add User"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Name (optional)</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Full name"
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Email *</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Role</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as "STUDENT" | "INSTRUCTOR")}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 mt-2">{addError}</p>}
          {addSuccess && <p className="text-xs text-emerald-600 mt-2">{addSuccess}</p>}
        </form>
      )}

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded border-zinc-300" />
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  Name {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("email")}>
                  Email {sortKey === "email" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("role")}>
                  Role {sortKey === "role" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("coursesEnrolled")}>
                  Enrolled {sortKey === "coursesEnrolled" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("coursesCompleted")}>
                  Completed {sortKey === "coursesCompleted" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Last Login</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("registeredAt")}>
                  Registered {sortKey === "registeredAt" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <AnimatePresence>
                {pageUsers.map((user) => (
                  <Fragment key={user.id}>
                    <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-zinc-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-zinc-300" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-white">{initials(user.name)}</span>
                        </div>
                        <span className="text-sm font-medium text-zinc-900">{user.name || "Unnamed"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${roleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-zinc-900 font-medium">{user.coursesEnrolled}</td>
                    <td className="px-4 py-3 text-center text-sm text-zinc-900 font-medium">{user.coursesCompleted}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">N/A</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{user.registeredAt}</td>
                    <td className="px-4 py-3">
                      {expanded === user.id ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </td>
                    </motion.tr>
                    {expanded === user.id && (
                      <tr className="bg-zinc-50/70">
                        <td colSpan={9} className="px-6 py-3">
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                            Enrolled Courses
                          </p>
                          {user.enrolledCourses.length === 0 ? (
                            <p className="text-sm text-zinc-400">No enrolled courses.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {user.enrolledCourses.map((course) => (
                                <div key={`${user.id}-${course.title}`} className="flex items-center justify-between text-sm">
                                  <span className="text-zinc-600">{course.title}</span>
                                  <span className="text-zinc-900 font-medium">{Math.round(course.progress)}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </AnimatePresence>
              {pageUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-zinc-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-zinc-500">
          <span>
            Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
