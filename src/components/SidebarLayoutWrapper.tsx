"use client";

import { useState, useEffect } from "react";
import { CompactSidebar, CompactNavItem } from "./CompactSidebar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { InstructorNotificationsDropdown } from "./InstructorNotificationsDropdown";
import { Logo } from "@/components/Logo";

interface SidebarLayoutWrapperProps {
  items: CompactNavItem[];
  role: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

function dashboardHome(role: string) {
  if (role === "STUDENT") return "/student";
  if (role === "ADMIN") return "/admin";
  return "/instructor";
}

export function SidebarLayoutWrapper({
  items,
  role,
  children,
}: SidebarLayoutWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-open");
    if (saved === "true") setIsOpen(true);
  }, []);

  const toggleDesktop = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    localStorage.setItem("sidebar-open", String(nextState));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "var(--background)" }}>
      {/* Mobile Header */}
      <header
        className="lg:hidden flex items-center justify-between px-4 h-14 sticky top-0 z-30"
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Logo href={dashboardHome(role)} size="sm" />
        <div className="flex items-center gap-2">
          {role === "STUDENT" ? <NotificationsDropdown /> : <InstructorNotificationsDropdown />}
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 -mr-2 rounded-lg"
            style={{ color: "var(--foreground)" }}
            aria-label="Open navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <CompactSidebar
        items={items}
        role={role}
        userName=""
        userEmail=""
        isOpen={isOpen}
        isMobileOpen={isMobileOpen}
        onToggleDesktop={toggleDesktop}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <main
        className={cn(
          "flex-1 min-h-screen transition-[margin] duration-300 ease-in-out",
          mounted ? (isOpen ? "lg:ml-[240px]" : "lg:ml-[64px]") : "lg:ml-[64px]"
        )}
      >
        {/* Floating Notification Dropdown on Desktop */}
        <div className="absolute top-6 right-8 z-30 hidden lg:block">
          {role === "STUDENT" ? <NotificationsDropdown /> : <InstructorNotificationsDropdown />}
        </div>
        {children}
      </main>
    </div>
  );
}
