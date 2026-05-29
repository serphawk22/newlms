"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronLeft, ChevronRight, ChevronDown, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface SidebarNavProps {
  items: NavItem[];
  role: string;
  orgName: string;
  userName?: string;
  userEmail?: string;
}

export function SidebarNav({
  items,
  role,
  orgName,
  userName,
  userEmail,
}: SidebarNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMobileOpen(false); setProfileOpen(false); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isActive = (href: string) => {
    if (href.includes("?") || href.includes("#")) return false;
    if (href === "/instructor" || href === "/student") return pathname === href;
    return pathname.startsWith(href);
  };

  // Get user initials for avatar
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // Role display color
  const roleColor =
    role === "ADMIN"
      ? "bg-violet-100 text-violet-700"
      : role === "INSTRUCTOR"
      ? "bg-blue-100 text-blue-700"
      : "bg-emerald-100 text-emerald-700";

  const navContent = (
    <div className="flex flex-col h-full">
      {/* ── Logo + Org ── */}
      <div className={cn("px-4 pt-5 pb-4 border-b border-zinc-100", collapsed && "px-3")}>
        <Logo href={role === "STUDENT" ? "/student" : "/instructor"} />
        {!collapsed && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">
              {orgName}
            </p>
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold", roleColor)}>
              {role}
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={cn("flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden", collapsed && "px-2")} aria-label="Main navigation">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg text-sm font-medium",
                "transition-all duration-200",
                "group",
                collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                active
                  ? "bg-zinc-100 text-zinc-900 border-l-2 border-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border-l-2 border-transparent"
              )}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
            >
              {item.icon && (
                <span className={cn(
                  "w-5 h-5 flex items-center justify-center shrink-0",
                  active ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-900"
                )}>
                  {item.icon}
                </span>
              )}

              {/* Label */}
              {!collapsed && (
                <span className="truncate flex-1">
                  {item.label}
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {item.label}
                </div>
              )}

              {!collapsed && item.badge !== undefined && (
                <span className={cn(
                  "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center",
                  active ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700"
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User section ── */}
      <div className={cn("px-3 py-4 border-t border-zinc-100 space-y-3 mt-auto", collapsed && "px-2")}>
        {/* Profile dropdown */}
        {userName && (
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={cn(
                "flex items-center gap-3 w-full rounded-lg transition-colors hover:bg-zinc-50",
                collapsed ? "justify-center p-2" : "px-2 py-2"
              )}
              title={collapsed ? userName : undefined}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-black text-white">{initials}</span>
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-bold text-zinc-900 truncate">{userName}</p>
                    {userEmail && (
                      <p className="text-[10px] text-zinc-400 truncate">{userEmail}</p>
                    )}
                  </div>
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 text-zinc-400 transition-transform duration-200",
                    profileOpen && "rotate-180"
                  )} />
                </>
              )}
            </button>

            {/* Collapsed tooltip */}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg pointer-events-none">
                {userName}
              </div>
            )}

            {/* Dropdown menu */}
            {profileOpen && !collapsed && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="px-4 py-3 border-b border-zinc-100">
                  <p className="text-xs font-bold text-zinc-900 truncate">{userName}</p>
                  {userEmail && (
                    <p className="text-[10px] text-zinc-400 truncate">{userEmail}</p>
                  )}
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5", roleColor)}>
                    {role}
                  </span>
                </div>
                <div className="p-2">
                  <Link
                    href={role === "STUDENT" ? "/student/profile" : "/instructor/profile"}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <UserCircle className="w-4 h-4" />
                    My Profile
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {!collapsed && <LogoutButton />}
      </div>

      {/* Collapse toggle button (desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-zinc-200 rounded-full items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 shadow-sm transition-colors z-50"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-white border border-zinc-200 rounded-xl p-2 text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full bg-white border-r border-zinc-200 flex flex-col transition-all duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen",
          collapsed ? "w-16" : "w-72",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
        role="navigation"
        aria-label="Sidebar navigation"
      >
        {navContent}
      </aside>
    </>
  );
}
