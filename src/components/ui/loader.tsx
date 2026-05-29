"use client";

import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

interface LoaderProps {
  variant?: "spinner" | "dots" | "ring" | "bars";
  size?: "sm" | "md" | "lg";
  label?: string;
  fullPage?: boolean;
}

const sizeMap = {
  sm: { icon: 16, ring: 24 },
  md: { icon: 24, ring: 40 },
  lg: { icon: 32, ring: 56 },
};

function Spinner({ size }: { size: "sm" | "md" | "lg" }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <Loader2 size={sizeMap[size].icon} className="text-zinc-400" />
    </motion.div>
  );
}

function Dots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="size-2 rounded-full bg-zinc-400"
          animate={{ y: [-4, 4, -4] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function Ring({ size }: { size: "sm" | "md" | "lg" }) {
  const s = sizeMap[size].ring;
  return (
    <div className="relative" style={{ width: s, height: s }}>
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-transparent"
        style={{
          borderTopColor: "oklch(0.6 0.15 250)",
          borderRightColor: "oklch(0.6 0.15 250)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-1 rounded-full border-2 border-transparent"
        style={{
          borderBottomColor: "oklch(0.6 0.1 200)",
          borderLeftColor: "oklch(0.6 0.1 200)",
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

const barConfig = {
  sm: { heights: [8, 14, 18, 14, 8], className: "w-0.5" },
  md: { heights: [10, 17, 24, 17, 10], className: "w-1" },
  lg: { heights: [14, 24, 32, 24, 14], className: "w-1.5" },
};

const delays = [0, 0.1, 0.2, 0.3, 0.4];

function Bars({ size }: { size: "sm" | "md" | "lg" }) {
  const config = barConfig[size];
  return (
    <div className="flex items-end gap-[3px]">
      {config.heights.map((h, i) => (
        <motion.div
          key={i}
          className={`${config.className} rounded-full bg-zinc-900`}
          style={{ height: h }}
          animate={{ height: [h * 0.5, h, h * 0.5] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delays[i],
          }}
        />
      ))}
    </div>
  );
}

export function Loader({
  variant = "ring",
  size = "md",
  label,
  fullPage = false,
}: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {variant === "bars" && <Bars size={size} />}
      {variant === "spinner" && <Spinner size={size} />}
      {variant === "dots" && <Dots />}
      {variant === "ring" && <Ring size={size} />}
      {label && (
        <motion.p
          className="text-sm text-zinc-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
