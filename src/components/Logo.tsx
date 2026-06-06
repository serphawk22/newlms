"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Collapsed state for sidebar - shows icon-only version */
  collapsed?: boolean;
}

export function Logo({ className = "", collapsed = false }: LogoProps) {
  if (collapsed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          className
        )}
        style={{ userSelect: "none", pointerEvents: "none", cursor: "default" }}
      >
        <span className="lms-logo-mark lms-logo-mark-collapsed">
          <img
            src="/ally-tech-logo.png"
            alt="Ally Tech Services"
            className="h-8 w-8 rounded object-cover object-left"
            style={{ userSelect: "none", pointerEvents: "none" }}
            draggable={false}
          />
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      style={{ userSelect: "none", pointerEvents: "none", cursor: "default" }}
    >
      <span className="lms-logo-mark">
        <img
          src="/ally-tech-logo.png"
          alt="Ally Tech Services"
          className="h-7 w-auto object-contain"
          style={{ userSelect: "none", pointerEvents: "none" }}
          draggable={false}
        />
      </span>
    </span>
  );
}
