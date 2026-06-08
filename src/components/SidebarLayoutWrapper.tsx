"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { CompactSidebar, CompactNavItem } from "./CompactSidebar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { InstructorNotificationsDropdown } from "./InstructorNotificationsDropdown";
import { DashboardSearch } from "@/components/DashboardSearch";
import ThemeToggle from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

interface SidebarLayoutWrapperProps {
  items: CompactNavItem[];
  role: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function SidebarLayoutWrapper({
  items,
  role,
  userName,
  userEmail,
  children,
}: SidebarLayoutWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const isDashboardPage =
    role === "STUDENT" ? pathname.startsWith("/student") :
    role === "INSTRUCTOR" ? pathname.startsWith("/instructor") :
    pathname.startsWith("/admin");

  const showSearch = isDashboardPage && (role === "INSTRUCTOR" || role === "ADMIN");

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
        <Logo size="sm" />
        <div className="flex items-center gap-2 shrink-0">
          {showSearch && <DashboardSearch role={role} />}
          <ThemeToggle />
          {isDashboardPage && (role === "STUDENT" ? <NotificationsDropdown /> : <InstructorNotificationsDropdown />)}
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 -mr-2 rounded-lg"
            style={{ color: "var(--foreground)" }}
            aria-label="Open navigation"
            suppressHydrationWarning
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <CompactSidebar
        items={items}
        role={role}
        userName={userName}
        userEmail={userEmail}
        isOpen={mounted ? isOpen : false}
        isMobileOpen={isMobileOpen}
        onToggleDesktop={toggleDesktop}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <main
        className={cn(
          "relative flex-1 min-h-screen transition-[margin] duration-300 ease-in-out",
          mounted ? (isOpen ? "lg:ml-[240px]" : "lg:ml-[64px]") : "lg:ml-[64px]"
        )}
      >
        {/* Desktop actions bar */}
        <div className="hidden lg:flex items-center gap-3 px-4 lg:px-8 py-2 h-12 sticky top-0 z-20 shrink-0"
             style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
          {showSearch && <DashboardSearch role={role} />}
          <div className="flex-1" />
          <div className="flex items-center gap-2 shrink-0">
            {isDashboardPage && (role === "STUDENT" ? <NotificationsDropdown /> : <InstructorNotificationsDropdown />)}
            <ThemeToggle />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
