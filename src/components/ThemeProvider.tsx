"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  isPublic: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const PUBLIC_PATH_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/student/login",
  "/student/signup",
  "/instructor/login",
  "/instructor/signup",
  "/admin/login",
];

function isPublicPath(pathname: string) {
  // Exact "/" should be public, and explicit auth pages too.
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((p) => p !== "/" && pathname.startsWith(p));
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const publicRoute = isPublicPath(pathname);

  const [theme, setThemeState] = useState<Theme>("light");

  // Initialize theme (internal routes only).
  useEffect(() => {
    if (publicRoute) {
      setThemeState("light");
      applyTheme("light");
      return;
    }
    const initial = getInitialTheme();
    setThemeState(initial);
    applyTheme(initial);
  }, [publicRoute]);

  const setTheme = useMemo(() => {
    return (nextTheme: Theme) => {
      setThemeState(nextTheme);
      applyTheme(nextTheme);
      // No persistence on public routes.
      if (!publicRoute) {
        localStorage.setItem("theme", nextTheme);
      }
    };
  }, [publicRoute]);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme: publicRoute ? "light" : theme,
      isPublic: publicRoute,
      setTheme,
      toggleTheme: () => {
        if (publicRoute) return;
        setTheme(theme === "dark" ? "light" : "dark");
      },
    };
  }, [publicRoute, setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

