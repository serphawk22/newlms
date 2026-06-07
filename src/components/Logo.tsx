"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Collapsed state for sidebar - scales logo to fill available width */
  collapsed?: boolean;
}

export function Logo({ className = "", collapsed = false }: LogoProps) {
  if (collapsed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-full h-full",
          className
        )}
        style={{ userSelect: "none", pointerEvents: "none", cursor: "default" }}
      >
        <span className="lms-logo-mark lms-logo-mark-collapsed">
          <img
            src="/ally-tech-logo.png"
            alt="Ally Tech Services"
            className="w-full h-auto max-h-[44px] object-contain"
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
