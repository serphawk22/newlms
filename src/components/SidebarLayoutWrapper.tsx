"use client";

import { useState, useEffect } from "react";
import { CompactSidebar, CompactNavItem } from "./CompactSidebar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

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

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-open");
    if (saved === "true") {
      setIsOpen(true);
    }
  }, []);

  const toggleDesktop = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    localStorage.setItem("sidebar-open", String(nextState));
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-zinc-950 text-white sticky top-0 z-30">
        <div className="font-medium tracking-tight text-lg">OG LMS</div>
        <button onClick={toggleMobile} className="p-2 -mr-2">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <CompactSidebar
        items={items}
        role={role}
        userName={userName}
        userEmail={userEmail}
        isOpen={isOpen}
        isMobileOpen={isMobileOpen}
        onToggleDesktop={toggleDesktop}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <main
        className={cn(
          "flex-1 min-h-screen transition-[margin] duration-300 ease-in-out relative",
          mounted ? (isOpen ? "lg:ml-[240px]" : "lg:ml-[64px]") : "lg:ml-[64px]"
        )}
      >
        {children}
      </main>
    </div>
  );
}
