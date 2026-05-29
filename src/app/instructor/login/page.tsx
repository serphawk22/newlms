"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Hash, AlertCircle, ArrowLeft, CheckCircle, BookOpen, Eye, EyeOff, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import BarsLoader from "@/components/ui/bars-loader";

function FloatingOrbs() {
  const orbs = useCallback(() => {
    return [
      { size: "w-[28rem] h-[28rem]", color: "bg-purple-500", x: "-translate-x-1/3", y: "-translate-y-1/3", delay: 0 },
      { size: "w-[20rem] h-[20rem]", color: "bg-blue-500", x: "translate-x-1/2", y: "translate-y-1/2", delay: 2 },
      { size: "w-[16rem] h-[16rem]", color: "bg-emerald-500", x: "translate-x-1/3", y: "-translate-y-1/4", delay: 4 },
      { size: "w-[12rem] h-[12rem]", color: "bg-violet-400", x: "-translate-x-1/2", y: "translate-y-2/3", delay: 1 },
    ];
  }, []);

  return (
    <>
      {orbs().map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute ${orb.size} ${orb.color} blur-[120px] rounded-full opacity-30 ${orb.x} ${orb.y}`}
          animate={{
            scale: [1, 1.15, 1, 0.9, 1],
            opacity: [0.3, 0.45, 0.25, 0.4, 0.3],
          }}
          transition={{
            duration: 12 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}
    </>
  );
}

function GridPattern() {
  return (
    <div className="absolute inset-0 opacity-[0.03]">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

export default function InstructorLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Clear stale error params from URL on mount
  useEffect(() => {
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

    if (!loginCode) {
      setError("Login Code is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, loginCode, requestedRole: "INSTRUCTOR" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      // CRITICAL: Verify role is INSTRUCTOR before allowing access
      if (data.role !== "INSTRUCTOR") {
        setError("This login is for instructors only. Please use the correct login page for your role.");
        setLoading(false);
        return;
      }

      setLoading(false);
      // Force full server navigation to ensure the auth cookie is sent with the request
      window.location.href = data.redirect ?? "/instructor";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-50">
      {/* Left — Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        className="lg:w-[55%] flex items-center justify-center p-6 sm:p-10 order-2 lg:order-1 relative"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-purple-500/5 blur-[100px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl shadow-zinc-200/50 border border-zinc-100 p-8 sm:p-10">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-600 text-sm font-medium mb-8 transition-all duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to home
            </Link>

            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-medium mb-4">
                <Sparkles className="w-3 h-3" />
                Instructor Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-medium text-zinc-900 tracking-tight">Welcome Back</h1>
              <p className="text-zinc-400 text-sm mt-1.5">Sign in to manage your courses</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  className="flex items-start gap-2.5 p-3.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="instructor-email" className="text-sm font-medium text-zinc-700">Email</Label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${focusedField === "email" ? "text-zinc-900" : "text-zinc-400"}`} />
                  <Input
                    id="instructor-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className="pl-10 h-12 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-xl transition-all duration-200 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="instructor-password" className="text-sm font-medium text-zinc-700">Password</Label>
                  <button type="button" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${focusedField === "password" ? "text-zinc-900" : "text-zinc-400"}`} />
                  <Input
                    id="instructor-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className="pl-10 h-12 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-xl transition-all duration-200 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instructor-loginCode" className="text-sm font-medium text-zinc-700">
                  Login Code
                  <span className="ml-1.5 text-xs text-zinc-400 font-normal">(e.g. STU4839)</span>
                </Label>
                <div className="relative">
                  <Hash className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${focusedField === "loginCode" ? "text-zinc-900" : "text-zinc-400"}`} />
                  <Input
                    id="instructor-loginCode"
                    name="loginCode"
                    type="text"
                    placeholder="STU4839"
                    required
                    maxLength={10}
                    onFocus={() => setFocusedField("loginCode")}
                    onBlur={() => setFocusedField(null)}
                    className="pl-10 h-12 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-xl transition-all duration-200 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                  />
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-zinc-300" />
                  Use the login code provided by your institution
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white hover:from-zinc-800 hover:to-zinc-700 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-zinc-900/10 hover:shadow-zinc-900/20 active:scale-[0.98]"
                disabled={loading}
              >
                {loading && <BarsLoader size="sm" />}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500">
              Don&apos;t have access?{" "}
              <Link href="/instructor/signup" className="font-medium text-zinc-900 hover:text-zinc-700 transition-colors underline underline-offset-2 decoration-zinc-300 hover:decoration-zinc-700">
                Request Access
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Right — Feature Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="lg:w-[45%] bg-zinc-950 p-8 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-center relative overflow-hidden order-1 lg:order-2"
      >
        <FloatingOrbs />
        <GridPattern />

        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-10"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/10 flex items-center justify-center mb-6 backdrop-blur-sm">
              <BookOpen className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium text-white mb-3 tracking-tight">Instructor Dashboard</h2>
            <p className="text-zinc-500 text-sm">Instructor Portal — SERP LMS</p>
          </motion.div>

          <div className="space-y-4">
            {[
              { text: "Build and manage courses", icon: "book" },
              { text: "Monitor student progress", icon: "chart" },
              { text: "Host live interactive classes", icon: "video" },
              { text: "AI-powered teaching tools", icon: "sparkles" },
            ].map((feature, i) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-3 group"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors duration-200">
                  {feature.text}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-14 pt-8 border-t border-zinc-800/50"
          >
            <p className="text-sm text-zinc-500 italic leading-relaxed">
              &ldquo;The analytics and AI tools have saved me hours of grading. My students are more engaged than ever.&rdquo;
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-xs font-medium text-white">
                PM
              </div>
              <div>
                <p className="text-sm text-zinc-300 font-medium">Priya M.</p>
                <p className="text-xs text-zinc-600">Physics Instructor</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
