"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BarsLoader from "@/components/ui/bars-loader";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
} as const;

function getSavedStudentEmail() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("student-remember-email") ?? "";
}

export default function StudentLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savedEmail] = useState(getSavedStudentEmail);
  const [rememberMe, setRememberMe] = useState(() => Boolean(getSavedStudentEmail()));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      setError(errorParam);
    }
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const loginCode = (formData.get("loginCode") as string)?.trim().toUpperCase();

    if (rememberMe) {
      localStorage.setItem("student-remember-email", email);
    } else {
      localStorage.removeItem("student-remember-email");
    }

    if (!loginCode) {
      setError("Login Code is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, loginCode, requestedRole: "STUDENT" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      if (data.role !== "STUDENT") {
        setError(
          "This login is for students only. Please use the correct login page for your role."
        );
        setLoading(false);
        return;
      }

      setLoading(false);
      window.location.href = data.redirect ?? "/student";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <AuthPageShell variant="student" logoHref="/">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-medium tracking-tight" style={{ color: "var(--foreground)" }}>
            Sign in
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--muted-foreground)" }}>
            Access your courses, assignments, and live classes
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-6">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/google?role=STUDENT&intent=login";
            }}
            className="w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2 btn-secondary"
          >
            <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="relative flex items-center justify-center mt-5 mb-1">
          <div className="border-t w-full" style={{ borderColor: "var(--border)" }}></div>
          <span className="absolute px-3 text-xs uppercase" style={{ color: "var(--muted-foreground)", backgroundColor: "var(--card)" }}>
            Or continue with email
          </span>
        </motion.div>

        <form onSubmit={handleLogin} className="mt-7 space-y-4">
          {error && (
            <motion.p
              variants={itemVariants}
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                color: "var(--accent)",
                background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
              }}
            >
              {error}
            </motion.p>
          )}

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label htmlFor="student-email">Email</Label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              <Input
                id="student-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                defaultValue={savedEmail}
                key={savedEmail ? "with-email" : "empty"}
                className="pl-10 h-11 rounded-lg"
                style={{ background: "var(--input)", borderColor: "var(--border)" }}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label htmlFor="student-password">Password</Label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              <Input
                id="student-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="pl-10 pr-10 h-11 rounded-lg"
                style={{ background: "var(--input)", borderColor: "var(--border)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted-foreground)" }}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-1.5">
            <Label htmlFor="student-loginCode">Login code</Label>
            <div className="relative">
              <Key
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              <Input
                id="student-loginCode"
                name="loginCode"
                type="text"
                placeholder="e.g. STU4839"
                required
                maxLength={10}
                className="pl-10 h-11 rounded-lg uppercase tracking-widest"
                style={{ background: "var(--input)", borderColor: "var(--border)" }}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border"
                style={{ borderColor: "var(--border)" }}
              />
              Remember me
            </label>
            <button type="button" className="hover:underline" style={{ color: "var(--foreground)" }}>
              Forgot password?
            </button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 btn-primary"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <BarsLoader size="sm" /> Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </motion.div>
        </form>

        <motion.p variants={itemVariants} className="mt-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/student/signup" className="font-medium hover:underline" style={{ color: "var(--foreground)" }}>
            Create account
          </Link>
        </motion.p>
      </motion.div>
    </AuthPageShell>
  );
}
