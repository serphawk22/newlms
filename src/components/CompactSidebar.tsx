"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, LogOut, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

export function CompactSidebar({
  items,
  role,
  userName,
  isOpen,
  isMobileOpen,
  onToggleDesktop,
  onCloseMobile,
}: CompactSidebarProps) {
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isActive = useCallback(
    (href: string) => {
      if (href.includes("?") || href.includes("#")) return false;
      // Exact match for dashboard roots so /student doesn't match /student/courses etc.
      if (href === "/instructor" || href === "/student") return pathname === href;
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
    collapsed: { opacity: 0, x: -10, display: "none" },
    expanded: { opacity: 1, x: 0, display: "block" },
  };

  const renderNavLinks = () =>
    items.map((item) => {
      const active = isActive(item.href);
      return (
        <Link key={item.href + item.label} href={item.href} className="w-full relative group">
          <motion.div
            variants={navItemVariants}
            initial={isOpen ? "expanded" : "collapsed"}
            animate={isOpen ? "expanded" : "collapsed"}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={cn(
              "flex items-center h-10 rounded-lg transition-colors cursor-pointer mx-auto",
              isOpen ? "px-3" : "",
              active
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            )}
          >
            <span className="shrink-0 flex items-center justify-center">{item.icon}</span>

            <AnimatePresence>
              {isOpen && (
                <motion.span
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Tooltip for collapsed state */}
          {!isOpen && (
            <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-zinc-800 pointer-events-none">
              {item.label}
            </div>
          )}
        </Link>
      );
    });

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800">
        <Link
          href={role === "STUDENT" ? "/student" : "/instructor"}
          className="text-white font-medium text-lg tracking-tight shrink-0 flex items-center gap-2 overflow-hidden"
        >
          <span>OG</span>
          <AnimatePresence>
            {isOpen && (
              <motion.span
                variants={textVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={{ duration: 0.2 }}
              >
                LMS
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 py-4 px-3 overflow-y-auto overflow-x-hidden">
        {renderNavLinks()}
      </nav>

      {/* Bottom Logout */}
      <div className="border-t border-zinc-800 py-3 flex flex-col gap-1.5 px-3">
        <button onClick={handleLogout} className="w-full relative group">
          <motion.div
            variants={navItemVariants}
            initial={isOpen ? "expanded" : "collapsed"}
            animate={isOpen ? "expanded" : "collapsed"}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={cn(
              "flex items-center h-10 rounded-lg hover:bg-red-500/10 transition-colors text-zinc-400 hover:text-red-400 mx-auto",
              isOpen ? "px-3" : ""
            )}
          >
            <span className="shrink-0 flex items-center justify-center"><LogOut className="w-5 h-5" /></span>
            <AnimatePresence>
              {isOpen && (
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
          {!isOpen && (
            <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-zinc-800 pointer-events-none">
              Logout
            </div>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 240 : 64 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex fixed left-0 top-0 z-40 h-full flex-col bg-zinc-950 border-r border-zinc-800 overflow-visible"
      >
        {sidebarContent}
        
        {/* Toggle Button vertically centered */}
        <button
          onClick={onToggleDesktop}
          className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 items-center justify-center p-1.5 rounded-full bg-zinc-800 border-2 border-zinc-950 hover:bg-zinc-700 text-zinc-300 transition-colors shadow-lg"
        >
          {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
      </motion.aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden fixed left-0 top-0 z-50 h-full w-[240px] flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-hidden"
            >
              {/* Force 'isOpen' to be true for mobile rendering so text is visible */}
              <div className="w-[240px] h-full flex flex-col">
                <CompactSidebarContent
                  items={items}
                  role={role}
                  isActive={isActive}
                  handleLogout={handleLogout}
                  onCloseMobile={onCloseMobile}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Extract content logic to keep mobile fully expanded
function CompactSidebarContent({ items, role, isActive, handleLogout, onCloseMobile }: any) {
  return (
    <>
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800">
        <Link href={role === "STUDENT" ? "/student" : "/instructor"} className="text-white font-medium text-lg tracking-tight flex items-center gap-2">
          <span>OG LMS</span>
        </Link>
      </div>
      <nav className="flex-1 flex flex-col gap-1.5 py-4 px-3 overflow-y-auto">
        {items.map((item: any) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href + item.label} href={item.href} onClick={onCloseMobile} className={cn(
              "flex items-center h-10 px-3 rounded-lg transition-colors",
              active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            )}>
              <span className="shrink-0 flex items-center justify-center">{item.icon}</span>
              <span className="ml-3 text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 py-3 flex flex-col gap-1.5 px-3">
        <button onClick={handleLogout} className="flex items-center h-10 px-3 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
          <span className="shrink-0 flex items-center justify-center"><LogOut className="w-5 h-5" /></span>
          <span className="ml-3 text-sm font-medium">Logout</span>
        </button>
      </div>
    </>
  );
}
