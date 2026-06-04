"use client";

import { RingLoader, type RingLoaderProps } from "@/components/ui/ring-loader";
import { cn } from "@/lib/utils";

interface LoaderProps {
  /** All variants render the red/grey ring for consistency */
  variant?: "ring" | "spinner" | "dots" | "bars";
  size?: RingLoaderProps["size"];
  label?: string;
  fullPage?: boolean;
  className?: string;
}

export function Loader({
  variant: _variant = "ring",
  size = "md",
  label,
  fullPage = false,
  className,
}: LoaderProps) {
  const content = (
    <RingLoader size={size} label={label} className={className} />
  );

  if (fullPage) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        )}
        style={{ background: "color-mix(in srgb, var(--background) 85%, transparent)" }}
      >
        {content}
      </div>
    );
  }

  return content;
}
