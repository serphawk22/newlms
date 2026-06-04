"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, isPublic } = useTheme();
  if (isPublic) return null;

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-colors " +
        (className || "")
      }
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--secondary-background)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--card)";
      }}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

