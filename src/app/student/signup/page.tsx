"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Mail, Lock, AlertCircle, CheckCircle, Copy, Check, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BarsLoader from "@/components/ui/bars-loader";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function StudentSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const messageParam = params.get("message");
    if (errorParam) {
      setError(errorParam);
    }
    if (messageParam) {
      // Google OAuth redirect with pending approval message
      setPendingApproval(true);
    }
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
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
          code: formData.get("code"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      if (data.pendingApproval) {
        // Student accounts require admin approval
        if (data.loginCode) {
          setGeneratedCode(data.loginCode);
        }
        setPendingApproval(true);
      } else if (data.loginCode) {
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

  if (pendingApproval || generatedCode) {
    return (
      <AuthPageShell variant="student" logoHref="/">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="shadow-sm" style={{ borderColor: "var(--border)" }}>
            <CardContent className="pt-8 pb-8 space-y-6 text-center">
              <div className="flex justify-center">
                <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${
                  pendingApproval
                    ? "bg-amber-50 border-amber-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}>
                  {pendingApproval
                    ? <AlertCircle className="w-8 h-8 text-amber-600" />
                    : <CheckCircle className="w-8 h-8 text-emerald-600" />}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-medium text-zinc-900">
                  {pendingApproval ? "Registration Submitted!" : "Account Created!"}
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  {pendingApproval
                    ? "Your account is awaiting administrator approval. You will be able to log in once approved."
                    : "Save your login code — you\u0027ll need it every time you sign in."}
                </p>
              </div>

              {pendingApproval && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 font-medium">
                    ⏳ Awaiting administrator approval
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    An administrator will review your registration. Please check back later.
                  </p>
                </div>
              )}

              {generatedCode && (
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
              )}

              {generatedCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800 font-medium">
                    ⚠️ This code will NOT be shown again. Please save it before continuing.
                  </p>
                </div>
              )}

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => router.push("/student/login")}
                  className="w-full h-11 bg-zinc-900 text-white hover:bg-zinc-700 rounded-lg font-medium"
                >
                  {pendingApproval ? "Back to Login" : "Continue to Login"}
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell variant="student" logoHref="/">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Link href="/student/login" className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-medium" style={{ color: "var(--foreground)" }}>Create your account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>Join as a student and start learning</p>
        </div>

        <div className="rounded-xl p-6" style={{ border: "1px solid var(--border)", background: "var(--secondary-background)" }}>
            <div className="mb-5">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/api/auth/google?role=STUDENT&intent=signup";
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
            </div>

            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t w-full" style={{ borderColor: "var(--border)" }}></div>
              <span className="absolute px-3 text-xs uppercase" style={{ color: "var(--muted-foreground)", backgroundColor: "var(--secondary-background)" }}>
                Or continue with email
              </span>
            </div>

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



              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800">
                  A unique <strong>Login Code</strong> will be generated after registration. You&apos;ll need it every time you sign in.
                </p>
              </div>

              <Button type="submit" className="w-full h-11 rounded-lg font-medium" disabled={loading}>
                {loading && <BarsLoader size="sm" />}
                {loading ? "Creating account…" : "Sign up"}
              </Button>
            </form>
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          Already have an account?{" "}
          <Link href="/student/login" className="font-medium hover:underline" style={{ color: "var(--foreground)" }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </AuthPageShell>
  );
}
