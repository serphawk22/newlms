"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  /** Height of the logo image (default h-9) */
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
};

export function Logo({ className = "", href, size = "md" }: LogoProps) {
  const img = (
    <img
      src="/logo.png"
      alt=""
      className={cn(sizeClasses[size], "w-auto object-contain")}
    />
  );

  const content = <span className="lms-logo-mark">{img}</span>;

  if (href) {
    return (
      <Link href={href} className={cn("inline-flex shrink-0", className)}>
        {content}
      </Link>
    );
  }

  return <span className={cn("inline-flex shrink-0", className)}>{content}</span>;
}
