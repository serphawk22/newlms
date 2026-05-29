"use client";

import { motion } from "motion/react";

interface BarsLoaderProps {
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { heights: [4, 10, 16, 10, 4], className: "w-1 rounded-full bg-zinc-900" },
  md: { heights: [6, 14, 20, 14, 6], className: "w-1 rounded-full bg-zinc-900" },
  lg: { heights: [8, 18, 28, 18, 8], className: "w-1.5 rounded-full bg-zinc-900" },
};

const delays = [0, 100, 200, 300, 400];

export default function BarsLoader({ size = "md" }: BarsLoaderProps) {
  const config = sizeConfig[size];
  return (
    <div className="flex items-end gap-[3px]">
      {config.heights.map((h, i) => (
        <motion.div
          key={i}
          className={config.className}
          style={{ height: h }}
          animate={{ height: [h * 0.5, h, h * 0.5] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delays[i] / 1000,
          }}
        />
      ))}
    </div>
  );
}
