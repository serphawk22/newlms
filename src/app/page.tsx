"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { motion, type Variants } from 'framer-motion';
import { BookOpen, Video, Brain, FileSearch, Route, ClipboardCheck, ArrowRight, Sparkles, CheckCircle, LogIn, UserPlus } from 'lucide-react';

const Ballpit = dynamic(() => import('@/components/Ballpit'), { ssr: false });

const fadeUp: Variants = {
  hidden: { y: 30, opacity: 0 },
  visible: (i: number) => ({
    y: 0, opacity: 1,
    transition: { delay: i * 0.1, ease: "easeOut", duration: 0.5 },
  }),
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, ease: "easeOut" },
  },
};

const cardItem: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "easeOut", duration: 0.4 } },
};

const features = [
  { icon: <Video className="w-6 h-6" />, title: "Live Classes", desc: "Real-time interactive video sessions with screen sharing and recording." },
  { icon: <Brain className="w-6 h-6" />, title: "AI Chatbot", desc: "Smart assistant that answers course questions instantly." },
  { icon: <FileSearch className="w-6 h-6" />, title: "Plagiarism Detection", desc: "Automatic similarity checking for student submissions." },
  { icon: <BookOpen className="w-6 h-6" />, title: "Study Friend", desc: "Upload documents and get AI answers grounded in your materials." },
  { icon: <Route className="w-6 h-6" />, title: "Learning Roadmaps", desc: "Structured curricula with progress tracking and milestones." },
  { icon: <ClipboardCheck className="w-6 h-6" />, title: "Assignments", desc: "Create, submit, and grade assignments with rich feedback." },
];

const steps = [
  { num: "01", title: "Enroll", desc: "Sign up and enroll in courses that match your learning goals." },
  { num: "02", title: "Learn", desc: "Access live classes, materials, and AI-powered study tools." },
  { num: "03", title: "Achieve", desc: "Complete assignments, earn certificates, and track your progress." },
];

export default function Home() {
  return (
    <div className="w-full relative overflow-hidden" style={{ background: "var(--background)" }}>
      {/* ── Fixed Nav ── */}
      <nav className="fixed top-0 w-full px-6 py-4 flex justify-between items-center z-30 backdrop-blur-lg border-b" style={{ background: "color-mix(in srgb, var(--card) 80%, transparent)", borderColor: "var(--border)" }}>
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm" style={{ background: "var(--foreground)", color: "var(--background)" }}>
            <LogIn className="w-4 h-4 inline mr-1.5" /> Login
          </Link>
          <Link href="/login" className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors hidden sm:inline-flex items-center" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>
            <UserPlus className="w-4 h-4 inline mr-1.5" /> Sign Up
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        {/* Ballpit background */}
        <div className="absolute inset-0 z-0 opacity-30">
          <Ballpit
            count={30}
            gravity={0.3}
            friction={0.97}
            wallBounce={0.6}
            followCursor
            colors={["#5227FF", "#7cff67", "#ff6b6b", "#e0e0e0"]}
          />
        </div>
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div initial="hidden" animate="visible" className="space-y-8">
            <motion.div custom={0} variants={fadeUp}>
              
            </motion.div>
            <motion.h1 custom={1} variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]" style={{ color: "var(--foreground)" }}>
              Focus. <span style={{ color: "var(--muted-foreground)" }}>Learn.</span> Build.
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              A high-performance learning environment with live classes, AI-powered study tools, and comprehensive course management.
            </motion.p>
            <motion.div custom={3} variants={fadeUp} className="flex items-center justify-center gap-4 pt-4">
              <Link href="/student/login" className="px-8 py-3.5 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2" style={{ background: "var(--foreground)", color: "var(--background)" }}>
                Student Login
              </Link>
              <Link href="/student/signup" className="px-8 py-3.5 rounded-xl text-sm font-medium transition-colors" style={{ border: "2px solid var(--border)", color: "var(--foreground)" }}>
                Create Account
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Tagline Bar ── */}
      <section className="relative z-10 py-14 border-y" style={{ background: "var(--secondary-background)", borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl sm:text-2xl font-medium leading-relaxed" style={{ color: "var(--foreground)" }}
          >
            Empowering educators and students with AI-driven tools for a smarter learning experience.
          </motion.p>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16 space-y-4">
            <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--foreground)" }}>Everything you need</motion.h2>
            <motion.p custom={1} variants={fadeUp} className="max-w-xl mx-auto" style={{ color: "var(--muted-foreground)" }}>Powerful tools for instructors and students in one seamless platform.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <motion.div key={f.title} variants={cardItem} whileHover={{ y: -4 }} className="rounded-2xl p-6 transition-all" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--secondary-background)", color: "var(--foreground)" }}>{f.icon}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 py-24 px-6" style={{ background: "var(--secondary-background)" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16 space-y-4">
            <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--foreground)" }}>How it works</motion.h2>
            <motion.p custom={1} variants={fadeUp} className="max-w-xl mx-auto" style={{ color: "var(--muted-foreground)" }}>Three simple steps to start your learning journey.</motion.p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-16 left-[16.66%] right-[16.66%] h-0.5" style={{ background: "var(--border)" }} />
            {steps.map((step, i) => (
              <motion.div key={step.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center relative">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-lg font-black relative z-10 shadow-md" style={{ background: "var(--foreground)", color: "var(--background)" }}>
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: "var(--muted-foreground)" }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-24 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center rounded-3xl p-12 sm:p-16 shadow-xl" style={{ background: "var(--foreground)" }}>
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="mb-8 max-w-lg mx-auto" style={{ color: "var(--muted-foreground)" }}>Join thousands of students and instructors already using our platform.</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-medium transition-colors shadow-lg" style={{ background: "var(--card)", color: "var(--foreground)" }}>
            Login to Your Account <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 py-8 px-6 border-t text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
        <p>&copy; {new Date().getFullYear()} OG LMS. All rights reserved.</p>
      </footer>
    </div>
  );
}
