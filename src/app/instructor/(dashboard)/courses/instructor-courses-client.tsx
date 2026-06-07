"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { SearchBar } from "@/components/ui/search-bar";

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
      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search courses by name..." className="mb-6" />
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
