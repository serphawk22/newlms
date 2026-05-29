"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, Activity, Grid, Clock,
  SlidersHorizontal, BarChart2, DownloadCloud,
} from "lucide-react";

const reportLinks = [
  { label: "Overview",          href: "/instructor/reports/overview",          icon: LayoutDashboard   },
  { label: "Users",             href: "/instructor/reports/users",             icon: Users             },
  { label: "Courses",           href: "/instructor/reports/courses",           icon: BookOpen          },
  { label: "Learning Activities", href: "/instructor/reports/learning-activities", icon: Activity     },
  { label: "Training Matrix",   href: "/instructor/reports/training-matrix",   icon: Grid              },
  { label: "Timeline",          href: "/instructor/reports/timeline",          icon: Clock             },
  { label: "Custom",            href: "/instructor/reports/custom",            icon: SlidersHorizontal },
  { label: "Analytics",         href: "/instructor/reports/analytics",         icon: BarChart2         },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6">
      <nav className="w-[200px] shrink-0 space-y-1 hidden lg:block">
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 px-1">
          Reports
        </div>
        {reportLinks.map((link) => {
          const active = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 min-w-0">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              const csvLinks = document.querySelectorAll("[data-export-csv]");
              csvLinks.forEach((el) => (el as HTMLElement).click());
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <DownloadCloud className="w-4 h-4" />
            Training Progress
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
