"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  children: ReactNode;
  courseTitles: string[];
}

export function InstructorCoursesClient({ children, courseTitles }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-course-title]");
    if (!searchQuery.trim()) {
      cards.forEach((card) => card.style.removeProperty("display"));
      return;
    }
    const q = searchQuery.toLowerCase();
    cards.forEach((card) => {
      const title = (card.getAttribute("data-course-title") || "").toLowerCase();
      card.style.display = title.includes(q) ? "" : "none";
    });
  }, [searchQuery]);

  const hasMatch = courseTitles.some((t) =>
    t.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
        <Input
          placeholder="Search courses by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)", paddingLeft: "2.25rem" }}
          className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
        />
      </div>
      {searchQuery.trim() && !hasMatch ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
          No courses match your search.
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {children}
        </div>
      )}
    </>
  );
}
