"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search...", className }: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--muted-foreground)" }}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "var(--secondary-background)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          paddingLeft: "2.25rem",
        }}
        className="w-full focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
      />
    </div>
  );
}
