"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";

export function LoadingBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setLoading(true);
      prevPath.current = pathname;
      const timer = setTimeout(() => setLoading(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <>
          {/* Grey track */}
          <motion.div
            key={`${pathname}-track`}
            className="fixed top-0 left-0 z-[9998] h-[3px] w-full"
            style={{ background: "var(--border)" }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* Red progress */}
          <motion.div
            key={pathname}
            className="fixed top-0 left-0 z-[9999] h-[3px]"
            style={{ background: "var(--accent)" }}
            initial={{ width: "0%", left: "0%" }}
            animate={{
              width: ["0%", "35%", "75%", "92%"],
              transition: {
                duration: 2,
                ease: "easeOut",
                times: [0, 0.35, 0.7, 1],
              },
            }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
