"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BarsLoader from "@/components/ui/bars-loader";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
} as const;

function IllustrationPanel() {
  const circleCircumference = 2 * Math.PI * 36;
  const progressPercent = 84;
  const strokeDashoffset =
    circleCircumference * (1 - progressPercent / 100);

  const floatingDots = [
    { cx: "15%", cy: "20%", r: 3, delay: 0 },
    { cx: "85%", cy: "25%", r: 2, delay: 0.5 },
    { cx: "20%", cy: "75%", r: 2.5, delay: 1 },
    { cx: "80%", cy: "70%", r: 3, delay: 1.5 },
    { cx: "50%", cy: "10%", r: 2, delay: 0.8 },
    { cx: "10%", cy: "50%", r: 1.5, delay: 2 },
    { cx: "90%", cy: "50%", r: 2.5, delay: 1.2 },
    { cx: "35%", cy: "88%", r: 2, delay: 0.3 },
    { cx: "65%", cy: "12%", r: 1.5, delay: 1.8 },
  ];

  return (
    <div className="relative w-full h-full bg-green-50 rounded-2xl flex flex-col items-center justify-center overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle
          cx="200"
          cy="250"
          r="160"
          fill="none"
          stroke="#d9e6d9"
          strokeWidth="1"
          strokeDasharray="8 6"
        />
        <circle
          cx="200"
          cy="250"
          r="120"
          fill="none"
          stroke="#d9e6d9"
          strokeWidth="0.5"
          strokeDasharray="4 8"
        />
        {floatingDots.map((dot, i) => (
          <motion.circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill="#d9e6d9"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.4, 0.8, 0.4],
              y: [0, -6, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: dot.delay,
            }}
          />
        ))}
      </svg>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="absolute top-[18%] right-[15%] w-10 h-10 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-700 shadow-sm z-10"
      >
        VJ
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
        className="absolute bottom-[25%] left-[12%] w-10 h-10 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-700 shadow-sm z-10"
      >
        ST
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        className="relative z-10 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-green-100 p-6 w-56"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-900">OG LMS</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
            Learning
          </span>
        </div>

        <p className="text-xs text-zinc-500 mb-4">Active Courses: 5</p>

        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#e4e4e7"
                strokeWidth="4"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#18181b"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circleCircumference}
                initial={{ strokeDashoffset: circleCircumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-zinc-900">
              {progressPercent}%
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-zinc-500 leading-tight">
              Overall progress
            </p>
            <p className="text-[11px] font-medium text-zinc-900">Keep going!</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="absolute bottom-[12%] text-center"
      >
        <p className="text-xs text-zinc-400">
          Learn smarter and achieve more
          <br />
          <span className="font-semibold text-zinc-600">with OG LMS</span>
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
        </div>
      </motion.div>
    </div>
  );
}

export default function StudentLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
    const loginCode = (formData.get("loginCode") as string)
      ?.trim()
      .toUpperCase();

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
        throw new Error(
          data.error || "Login failed. Please check your credentials."
        );
      }

      // CRITICAL: Verify role is STUDENT before allowing access
      if (data.role !== "STUDENT") {
        setError("This login is for students only. Please use the correct login page for your role.");
        setLoading(false);
        return;
      }

      setLoading(false);
      // Force full server navigation to ensure the auth cookie is sent with the request
      window.location.href = data.redirect ?? "/student";
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
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]"
      >
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-sm"
          >
            <motion.div variants={itemVariants}>
              <h1 className="text-4xl font-bold text-zinc-900">
                Welcome back!
              </h1>
              <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                Access your courses, assignments and live classes with OG LMS
              </p>
            </motion.div>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="space-y-1.5">
                <Label htmlFor="student-email" className="sr-only">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="student-email"
                    name="email"
                    type="email"
                    placeholder="Email address"
                    required
                    autoComplete="email"
                    className="pl-12 pr-5 h-12 bg-white border-zinc-200 rounded-full text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-0 focus:outline-none transition-all duration-200 ease-in-out"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <Label htmlFor="student-password" className="sr-only">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="student-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    className="pl-12 pr-12 h-12 bg-white border-zinc-200 rounded-full text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-0 focus:outline-none transition-all duration-200 ease-in-out"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <Label htmlFor="student-loginCode" className="sr-only">
                  Login Code
                </Label>
                <div className="relative">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="student-loginCode"
                    name="loginCode"
                    type="text"
                    placeholder="Login code (e.g. STU4839)"
                    required
                    maxLength={10}
                    className="pl-12 pr-5 h-12 bg-white border-zinc-200 rounded-full text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-0 focus:outline-none transition-all duration-200 ease-in-out uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex justify-end">
                <button
                  type="button"
                  className="text-zinc-500 text-sm hover:text-zinc-900 transition-colors duration-200"
                >
                  Forgot Password?
                </button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-12 bg-zinc-900 text-white rounded-full text-sm font-medium hover:bg-zinc-700 transition-all duration-200 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={loading}
                >
                  {loading && (
                    <BarsLoader size="sm" />
                  )}
                  {loading ? "Signing in..." : "Login"}
                </motion.button>
              </motion.div>
            </form>


            <motion.p
              variants={itemVariants}
              className="mt-6 text-center text-sm text-zinc-500"
            >
              Not a member?{" "}
              <Link
                href="/student/signup"
                className="font-medium text-zinc-900 hover:underline"
              >
                Register now
              </Link>
            </motion.p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="hidden md:block w-1/2 p-6"
        >
          <IllustrationPanel />
        </motion.div>
      </motion.div>
    </div>
  );
}
