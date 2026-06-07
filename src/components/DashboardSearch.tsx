"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type SearchEntry = {
  label: string;
  href: string;
  keywords: string[];
};

const INSTRUCTOR_ENTRIES: SearchEntry[] = [
  { label: "Dashboard", href: "/instructor", keywords: ["dashboard", "home", "overview"] },
  { label: "All Courses", href: "/instructor/all-courses", keywords: ["courses", "course library", "classes"] },
  { label: "Course Workspace", href: "/instructor/courses", keywords: ["workspace", "course manage", "modules", "lessons"] },
  { label: "Students", href: "/instructor/students", keywords: ["students", "learners", "users"] },
  { label: "Assignments", href: "/instructor/assignments", keywords: ["assignments", "homework", "tasks"] },
  { label: "Quizzes", href: "/instructor/quizzes", keywords: ["quizzes", "tests", "exams", "assessments"] },
  { label: "Analytics", href: "/instructor/analytics", keywords: ["analytics", "reports", "statistics", "metrics"] },
  { label: "Live Classes", href: "/instructor/live-classes", keywords: ["live classes", "sessions", "meetings", "zoom"] },
  { label: "Directory", href: "/instructor/directory", keywords: ["directory", "people", "team", "members"] },
  { label: "Profile", href: "/instructor/profile", keywords: ["profile", "account", "settings"] },
  { label: "Settings", href: "/instructor/settings", keywords: ["settings", "preferences", "organization"] },
];

const ADMIN_ENTRIES: SearchEntry[] = [
  { label: "Dashboard", href: "/admin", keywords: ["dashboard", "home", "overview"] },
  { label: "All Courses", href: "/admin/all-courses", keywords: ["courses", "course library", "classes"] },
  { label: "User Directory", href: "/admin/users", keywords: ["users", "people", "accounts", "directory"] },
  { label: "Students", href: "/admin/users?filter=students", keywords: ["students", "learners"] },
  { label: "Instructors", href: "/admin/users?filter=instructors", keywords: ["instructors", "teachers"] },
  { label: "Reports", href: "/admin/reports", keywords: ["reports", "analytics", "statistics", "metrics"] },
  { label: "Learning Videos", href: "/admin/learning-videos", keywords: ["videos", "learning", "media", "content"] },
  { label: "Admin Panel", href: "/admin/admin-panel", keywords: ["admin panel", "control", "system", "settings"] },
  { label: "Certificates", href: "/admin/certificates", keywords: ["certificates", "certification", "credentials"] },
  { label: "Profile", href: "/admin/profile", keywords: ["profile", "account"] },
  { label: "Settings", href: "/admin/settings", keywords: ["settings", "organization", "preferences"] },
];

interface DashboardSearchProps {
  role: string;
  mobile?: boolean;
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: "#D9252A" }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

export function DashboardSearch({ role }: DashboardSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const entries = role === "INSTRUCTOR" ? INSTRUCTOR_ENTRIES : ADMIN_ENTRIES;

  const filtered = query
    ? entries.filter((e) => {
        const q = query.toLowerCase();
        return (
          e.label.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.includes(q))
        );
      })
    : entries;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setMobileOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].href);
    } else if (e.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
      inputRef.current?.blur();
    }
  };

  const resultCount = filtered.length;

  return (
    <div ref={containerRef} className="relative">
      {/* Desktop search bar */}
      <div className="hidden lg:flex items-center gap-2 rounded-xl border px-3 py-1.5 w-48 lg:w-56 transition-all duration-200 focus-within:w-64"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color: "var(--foreground)" }}
          aria-label="Search dashboard"
          autoComplete="off"
        />
      </div>

      {/* Mobile search icon */}
      <button
        type="button"
        className="lg:hidden p-2 -mr-2 rounded-lg"
        style={{ color: "var(--foreground)" }}
        onClick={() => {
          setMobileOpen(!mobileOpen);
          if (!mobileOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        aria-label="Open search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Mobile expanded search */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed left-0 right-0 top-14 z-40 px-4 py-3"
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2"
            style={{
              background: "var(--background)",
              borderColor: "var(--border)",
            }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search dashboard..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm outline-none min-w-0"
              style={{ color: "var(--foreground)" }}
              aria-label="Search dashboard"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setOpen(false);
                setQuery("");
              }}
              className="p-1 rounded-lg text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              ESC
            </button>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 right-0 w-72 rounded-xl border shadow-lg overflow-hidden z-50"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          }}
          role="listbox"
          aria-label="Search results"
        >
          <div
            className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}
          >
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </div>
          {resultCount === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              No results found
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1">
              {filtered.map((entry, i) => (
                <button
                  key={entry.href}
                  onClick={() => handleSelect(entry.href)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                  style={
                    i === selectedIndex
                      ? { background: "rgba(217,37,42,0.08)", color: "var(--foreground)" }
                      : { color: "var(--foreground)" }
                  }
                  role="option"
                  aria-selected={i === selectedIndex}
                >
                  {highlightMatch(entry.label, query)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
