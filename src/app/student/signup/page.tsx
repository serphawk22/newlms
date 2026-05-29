"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Mail, Lock, Key, AlertCircle, CheckCircle, Copy, Check, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BarsLoader from "@/components/ui/bars-loader";

export default function StudentSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

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
          code: formData.get("code"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      if (data.loginCode) {
        setGeneratedCode(data.loginCode);
      } else {
        router.push("/student/login");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
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
                <h2 className="text-2xl font-medium text-zinc-900">Account Created!</h2>
                <p className="text-zinc-500 text-sm mt-1">Save your login code — you&apos;ll need it every time you sign in.</p>
              </div>

              <div className="bg-zinc-50 border-2 border-zinc-200 rounded-xl p-5 space-y-3">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Your Login Code</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-medium tracking-widest text-zinc-900">{generatedCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700 transition-colors"
                    title="Copy code"
                  >
                    {codeCopied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">This code is unique to your account. Keep it safe.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-medium">
                  ⚠️ This code will NOT be shown again. Please save it before continuing.
                </p>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => router.push("/student/login")}
                  className="w-full h-11 bg-zinc-900 text-white hover:bg-zinc-700 rounded-lg font-medium"
                >
                  Continue to Login
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Link href="/student/login" className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-600 text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-medium text-zinc-900">Create your account</h1>
          <p className="text-zinc-500 text-sm mt-1">Join as a student and start learning</p>
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

              <div className="space-y-1.5">
                <Label htmlFor="student-signup-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input id="student-signup-name" name="name" required className="pl-9 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg" placeholder="Your full name" autoComplete="name" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="student-signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input id="student-signup-email" name="email" type="email" required className="pl-9 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg" placeholder="you@example.com" autoComplete="email" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="student-signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input id="student-signup-password" name="password" type="password" required className="pl-9 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg" autoComplete="new-password" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="student-signup-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input id="student-signup-confirm" name="confirmPassword" type="password" required className="pl-9 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="student-signup-code">Student Join Code</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input id="student-signup-code" name="code" required className="pl-9 h-11 bg-white border-zinc-200 focus:border-zinc-900 rounded-lg" placeholder="e.g. SRINDU2024" />
                </div>
                <p className="text-xs text-zinc-400">Ask your instructor for the student join code.</p>
              </div>

              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800">
                  A unique <strong>Login Code</strong> will be generated after registration. You&apos;ll need it every time you sign in.
                </p>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" className="w-full h-11 bg-zinc-900 text-white hover:bg-zinc-700 rounded-lg font-medium" disabled={loading}>
                  {loading && <BarsLoader size="sm" />}
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/student/login" className="font-medium text-zinc-900 hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
