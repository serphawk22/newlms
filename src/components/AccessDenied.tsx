"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonHref?: string;
}

export function AccessDenied({
  title = "Access Restricted",
  description = "You don't have permission to view this page.",
  buttonLabel = "Go to Dashboard",
  buttonHref = "/instructor",
}: AccessDeniedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-[65vh] flex flex-col items-center justify-center text-center px-4"
    >
      <Shield className="w-16 h-16 text-zinc-300 mb-4" />
      <h2 className="text-2xl font-medium text-zinc-900">{title}</h2>
      <p className="text-zinc-500 mt-2 max-w-md">{description}</p>
      <Link href={buttonHref} className="mt-6">
        <Button className="bg-zinc-900 text-white hover:bg-zinc-800">{buttonLabel}</Button>
      </Link>
    </motion.div>
  );
}
