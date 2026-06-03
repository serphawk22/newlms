"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User, Mail, Lock, Eye, EyeOff,
  AlertCircle, CheckCircle, Copy, Check,
  ArrowLeft, Shield, Crown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BarsLoader from "@/components/ui/bars-loader";

export default function AdminSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [error, setError] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check on mount if an admin already exists
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/check-admin");
        const data = await res.json();
        setAdminExists(!!data.adminExists);
      } catch {
        // On error, allow the registration attempt; the API will guard it
      } finally {
        setChecking(false);
      }
    }
    checkAdmin();
  }, []);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password,
          requestedRole: "ADMIN",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      if (data.loginCode) {
        setGeneratedCode(data.loginCode);
      } else {
        router.push("/admin/login");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Checking system status…</p>
        </div>
      </div>
    );
  }

  // ── Admin already exists — registration locked ─────────────────────────────
  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="shadow-sm border-zinc-200">
            <CardContent className="pt-8 pb-8 space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-medium text-zinc-900">Registration Disabled</h2>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                  An administrator account already exists. Public admin registration is
                  disabled for security. Contact your existing administrator to request access.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-medium">
                  🔒 Only existing admins can create additional administrator accounts.
                </p>
              </div>
              <Link href="/admin/login">
                <Button className="w-full h-11 bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700 rounded-lg font-medium">
                  Go to Admin Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Success — show generated login code ────────────────────────────────────
  if (generatedCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="shadow-sm border-zinc-200">
            <CardContent className="pt-8 pb-8 space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-medium text-zinc-900">Admin Account Created!</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Save your login code — you&apos;ll need it every time you sign in.
                </p>
              </div>

              <div className="bg-zinc-50 border-2 border-zinc-200 rounded-xl p-5 space-y-3">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                  Your Admin Login Code
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-medium tracking-widest text-zinc-900">
                    {generatedCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700 transition-colors"
                    title="Copy code"
                  >
                    {codeCopied
                      ? <Check className="w-5 h-5 text-emerald-500" />
                      : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  This code is unique to your admin account. Keep it safe.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-medium">
                  ⚠️ This code will NOT be shown again. Please save it before continuing.
                </p>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => router.push("/admin/login")}
                  className="w-full h-11 bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700 rounded-lg font-medium"
                >
                  Continue to Admin Login
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-600 text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin Login
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
              <Crown className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
              First Time Setup
            </span>
          </div>
          <h1 className="text-2xl font-medium text-zinc-900">Create Admin Account</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Set up the initial administrator for this system
          </p>
        </div>

        <Card className="shadow-sm border-zinc-200">
          <CardContent className="p-6">
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-signup-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="admin-signup-name"
                    name="name"
                    required
                    placeholder="Your full name"
                    autoComplete="name"
                    className="pl-9 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="admin-signup-email"
                    name="email"
                    type="email"
                    required
                    placeholder="admin@example.com"
                    autoComplete="email"
                    className="pl-9 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="admin-signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    className="pl-9 pr-10 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-signup-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="admin-signup-confirm"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="pl-9 pr-10 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <Shield className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-800">
                  A unique <strong>Admin Login Code</strong> will be generated after
                  registration. Store it securely — it cannot be recovered.
                </p>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700 rounded-lg font-medium"
                >
                  {loading && <BarsLoader size="sm" />}
                  {loading ? "Creating Account…" : "Create Admin Account"}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/admin/login" className="font-medium text-zinc-900 hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
