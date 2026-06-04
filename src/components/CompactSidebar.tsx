"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";

export interface CompactNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface CompactSidebarProps {
  items: CompactNavItem[];
  role: string;
  userName?: string;
  userEmail?: string;
  isOpen: boolean;
  isMobileOpen: boolean;
  onToggleDesktop: () => void;
  onCloseMobile: () => void;
}

function dashboardHome(role: string) {
  if (role === "STUDENT") return "/student";
  if (role === "ADMIN") return "/admin";
  return "/instructor";
}

export function CompactSidebar({
  items,
  role,
  isOpen,
  isMobileOpen,
  onToggleDesktop,
  onCloseMobile,
}: CompactSidebarProps) {
  const pathname = usePathname();
  const home = dashboardHome(role);

  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isActive = useCallback(
    (href: string) => {
      if (href.includes("?") || href.includes("#")) return false;
      if (href === "/instructor" || href === "/student" || href === "/admin") {
        return pathname === href;
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const navItemVariants = {
    collapsed: { width: "40px", justifyContent: "center" },
    expanded: { width: "100%", justifyContent: "flex-start" },
  };

  const textVariants = {
    collapsed: { opacity: 0, x: -10, display: "none" as const },
    expanded: { opacity: 1, x: 0, display: "block" as const },
  };

  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [logoutHovered, setLogoutHovered] = useState(false);

  const renderNavLinks = (expanded: boolean) =>
    items.map((item) => {
      const active = isActive(item.href);
      const isHovered = hoveredHref === item.href;
      return (
        <Link
          key={item.href + item.label}
          href={item.href}
          className="w-full relative group"
          onClick={expanded ? undefined : onCloseMobile}
        >
          <motion.div
            variants={navItemVariants}
            initial={expanded ? "expanded" : "collapsed"}
            animate={expanded ? "expanded" : "collapsed"}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            onMouseEnter={() => setHoveredHref(item.href)}
            onMouseLeave={() => setHoveredHref(null)}
            className={cn(
              "flex items-center h-10 rounded-lg transition-all cursor-pointer mx-auto relative",
              expanded ? "px-3" : "",
              active ? "font-semibold" : ""
            )}
            style={{
              background: active
                ? "var(--sidebar-accent)"
                : isHovered
                ? "rgba(255,255,255,0.04)"
                : "transparent",
              color: active || isHovered ? "#D9252A" : "var(--foreground)",
              borderLeft: active
                ? "3px solid #D9252A"
                : "3px solid transparent",
            }}
          >
            <span className="shrink-0 flex items-center justify-center">{item.icon}</span>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="ml-3 text-sm whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
          {!expanded && (
            <div
              className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 top-1/2 -translate-y-1/2 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-md pointer-events-none"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
              }}
            >
              {item.label}
            </div>
          )}
        </Link>
      );
    });

  const sidebarShell = (expanded: boolean) => (
    <>
      <div
        className="h-14 flex items-center px-3 shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <Logo href={home} size="sm" />
      </div>

      <nav className="flex-1 flex flex-col items-center gap-1 py-4 px-2 overflow-y-auto overflow-x-hidden">
        {renderNavLinks(expanded)}
      </nav>

      <div
        className="py-3 flex flex-col gap-1.5 px-2 shrink-0"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <button
          type="button"
          onClick={handleLogout}
          className="w-full relative group"
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
        >
          <motion.div
            variants={navItemVariants}
            initial={expanded ? "expanded" : "collapsed"}
            animate={expanded ? "expanded" : "collapsed"}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={cn(
              "flex items-center h-10 rounded-lg transition-all mx-auto",
              expanded ? "px-3" : ""
            )}
            style={{
              background: logoutHovered ? "rgba(255,255,255,0.04)" : "transparent",
              color: logoutHovered ? "#D9252A" : "var(--foreground)",
            }}
          >
            <span className="shrink-0 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </span>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="ml-3 text-sm font-medium whitespace-nowrap"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </button>
      </div>
    </>
  );

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 240 : 64 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex fixed left-0 top-0 z-40 h-full flex-col overflow-visible"
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {sidebarShell(isOpen)}
        <button
          type="button"
          onClick={onToggleDesktop}
          className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 items-center justify-center p-1.5 rounded-full transition-colors shadow-md"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
      </motion.aside>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden fixed left-0 top-0 z-50 h-full w-[240px] flex flex-col overflow-hidden"
              style={{
                background: "var(--sidebar)",
                borderRight: "1px solid var(--sidebar-border)",
              }}
            >
              <div className="w-[240px] h-full flex flex-col">{sidebarShell(true)}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
