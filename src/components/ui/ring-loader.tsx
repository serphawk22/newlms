"use client";

import { cn } from "@/lib/utils";

export interface RingLoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  /** Visually hidden text for screen readers */
  srLabel?: string;
}

const sizeMap = {
  sm: { box: 16, border: 2 },
  md: { box: 28, border: 3 },
  lg: { box: 44, border: 3 },
} as const;

/**
 * Red + grey spinning ring — brand-aligned loader used across the app.
 */
export function RingLoader({
  size = "md",
  label,
  className,
  srLabel = "Loading",
}: RingLoaderProps) {
  const { box, border } = sizeMap[size];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <span
        role="status"
        aria-label={srLabel}
        className="inline-block rounded-full animate-spin"
        style={{
          width: box,
          height: box,
          borderWidth: border,
          borderStyle: "solid",
          borderColor: "var(--border)",
          borderTopColor: "var(--accent)",
          borderRightColor: "color-mix(in srgb, var(--accent) 35%, var(--border))",
        }}
      />
      {label ? (
        <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </p>
      ) : null}
    </div>
  );
}

export default RingLoader;
