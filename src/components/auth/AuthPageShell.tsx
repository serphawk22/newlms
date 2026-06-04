"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { AuthBrandingPanel } from "./AuthBrandingPanel";

type AuthVariant = "student" | "instructor" | "admin";

interface AuthPageShellProps {
  variant: AuthVariant;
  logoHref?: string;
  children: React.ReactNode;
}

export function AuthPageShell({ variant, logoHref = "/", children }: AuthPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo href={logoHref} size="md" />
      </header>

      <div className="flex-1 flex items-center justify-center p-4 pt-16 sm:p-6 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[560px]"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="hidden md:block md:w-1/2 p-4 lg:p-5 order-1">
            <AuthBrandingPanel variant={variant} />
          </div>

          <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 order-2">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
