"use client";

/**
 * @deprecated Use `RingLoader` from `@/components/ui/ring-loader`.
 * Kept for existing imports — renders the red/grey ring loader.
 */
import { RingLoader, type RingLoaderProps } from "@/components/ui/ring-loader";

export type BarsLoaderProps = Pick<RingLoaderProps, "size" | "className">;

export default function BarsLoader({ size = "md", className }: BarsLoaderProps) {
  return <RingLoader size={size} className={className} />;
}
