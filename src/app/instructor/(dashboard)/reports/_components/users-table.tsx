"use client";

import { Fragment, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Download, Plus, X } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import { RingLoader } from "@/components/ui/ring-loader";

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

  const getRoleStyle = (role: string) => {
    if (role === "ADMIN") {
      return {
        background: "rgba(217,37,42,0.12)",
        color: "#D9252A",
        borderColor: "rgba(217,37,42,0.25)",
      };
    }
    if (role === "INSTRUCTOR") {
      return {
        background: "rgba(255,255,255,0.06)",
        color: "var(--foreground)",
        borderColor: "var(--border)",
      };
    }
    return {
      background: "rgba(255,255,255,0.04)",
      color: "var(--muted-foreground)",
      borderColor: "var(--border)",
    };
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
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search users..." className="min-w-[200px] max-w-xs flex-1" />
        <select
          value={filter}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "all" || value === "active" || value === "inactive") {
              setFilter(value);
            }
            setPage(0);
          }}
          style={{
            background: "var(--secondary-background)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
          className="px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D9252A]"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={exportCSV}
          style={{
            background: "var(--secondary-background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A] transition-all"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
        <button
          onClick={() => { setShowAdd(!showAdd); setAddError(""); setAddSuccess(""); }}
          style={{ background: "#D9252A", color: "#FFFFFF" }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#C21F24] transition-colors ml-auto"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? "Cancel" : "Add User"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-4 p-4 border rounded-lg"
          style={{ borderColor: "var(--border)", background: "var(--secondary-background)" }}
        >
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>Name (optional)</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Full name"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                className="w-full text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D9252A] placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>Email *</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
                required
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                className="w-full text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D9252A] placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>Role</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as "STUDENT" | "INSTRUCTOR")}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                className="w-full text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D9252A]"
              >
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              style={{ background: "#D9252A", color: "#FFFFFF" }}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg hover:bg-[#C21F24] transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
            >
              {adding ? <RingLoader size="sm" className="inline-flex" /> : "Add"}
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 mt-2 font-medium">{addError}</p>}
          {addSuccess && <p className="text-xs mt-2 font-medium" style={{ color: "#D9252A" }}>{addSuccess}</p>}
        </form>
      )}

      <Card
        className="overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                <th className="w-10 px-4 py-3 text-center">
                  <input type="checkbox" className="rounded border-zinc-300 accent-[#D9252A]" />
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none" style={{ color: "var(--muted-foreground)" }} onClick={() => toggleSort("name")}>
                  Name {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none" style={{ color: "var(--muted-foreground)" }} onClick={() => toggleSort("email")}>
                  Email {sortKey === "email" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none" style={{ color: "var(--muted-foreground)" }} onClick={() => toggleSort("role")}>
                  Role {sortKey === "role" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none" style={{ color: "var(--muted-foreground)" }} onClick={() => toggleSort("coursesEnrolled")}>
                  Enrolled {sortKey === "coursesEnrolled" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none" style={{ color: "var(--muted-foreground)" }} onClick={() => toggleSort("coursesCompleted")}>
                  Completed {sortKey === "coursesCompleted" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Last Login</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none" style={{ color: "var(--muted-foreground)" }} onClick={() => toggleSort("registeredAt")}>
                  Registered {sortKey === "registeredAt" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              <AnimatePresence>
                {pageUsers.map((user) => (
                  <Fragment key={user.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,37,42,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-zinc-300 accent-[#D9252A]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border" style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}>
                            <span className="text-[9px] font-bold" style={{ color: "var(--foreground)" }}>{initials(user.name)}</span>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{user.name || "Unnamed"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider"
                          style={getRoleStyle(user.role)}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold" style={{ color: "var(--foreground)" }}>{user.coursesEnrolled}</td>
                      <td className="px-4 py-3 text-center text-sm font-semibold" style={{ color: "var(--foreground)" }}>{user.coursesCompleted}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>N/A</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--muted-foreground)" }}>{user.registeredAt}</td>
                      <td className="px-4 py-3">
                        {expanded === user.id ? <ChevronUp className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />}
                      </td>
                    </motion.tr>
                    {expanded === user.id && (
                      <tr style={{ background: "var(--secondary-background)", borderBottom: "1px solid var(--border)" }}>
                        <td colSpan={9} className="px-6 py-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                            Enrolled Courses
                          </p>
                          {user.enrolledCourses.length === 0 ? (
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No enrolled courses.</p>
                          ) : (
                            <div className="space-y-1.5 max-w-md">
                              {user.enrolledCourses.map((course) => (
                                <div key={`${user.id}-${course.title}`} className="flex items-center text-sm py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                                  <span style={{ color: "var(--foreground)" }}>{course.title}</span>
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
                  <td colSpan={9} className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <span>
            Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              style={{
                background: "var(--secondary-background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A] transition-all cursor-pointer"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              style={{
                background: "var(--secondary-background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A] transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
