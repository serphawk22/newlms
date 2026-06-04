"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  BarChart3,
  Users,
  Video,
  Shield,
  GraduationCap,
  ClipboardList,
} from "lucide-react";

type AuthVariant = "student" | "instructor" | "admin";

const copy: Record<
  AuthVariant,
  { title: string; subtitle: string; features: string[] }
> = {
  student: {
    title: "Your learning hub",
    subtitle: "Courses, assignments, live classes, and progress in one place.",
    features: [
      "Track course progress and deadlines",
      "Join live classes and study sessions",
      "Submit assignments and take quizzes",
      "AI-powered study assistance",
    ],
  },
  instructor: {
    title: "Teaching workspace",
    subtitle: "Manage courses, students, and live sessions efficiently.",
    features: [
      "Build and publish course content",
      "Monitor student engagement",
      "Host live interactive sessions",
      "Review submissions and analytics",
    ],
  },
  admin: {
    title: "Organization control",
    subtitle: "Enterprise administration, reporting, and user management.",
    features: [
      "Manage users and permissions",
      "Oversee courses and enrollments",
      "System-wide analytics and reports",
      "Configure organization settings",
    ],
  },
};

const icons = [BookOpen, BarChart3, Users, Video];

export function AuthBrandingPanel({ variant }: { variant: AuthVariant }) {
  const { title, subtitle, features } = copy[variant];
  const HeroIcon =
    variant === "admin" ? Shield : variant === "instructor" ? GraduationCap : BookOpen;

  return (
    <div
      className="relative w-full h-full min-h-[280px] md:min-h-0 rounded-xl overflow-hidden flex flex-col justify-center p-8 sm:p-10"
      style={{ background: "var(--secondary-background)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          <HeroIcon className="w-6 h-6" style={{ color: "var(--accent)" }} />
        </div>

        <h2
          className="text-2xl sm:text-3xl font-medium tracking-tight mb-2"
          style={{ color: "var(--foreground)" }}
        >
          {title}
        </h2>
        <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--muted-foreground)" }}>
          {subtitle}
        </p>

        <ul className="space-y-3">
          {features.map((text, i) => {
            const Icon = icons[i] ?? ClipboardList;
            return (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="flex items-center gap-3 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: "var(--foreground)" }} />
                </span>
                {text}
              </motion.li>
            );
          })}
        </ul>
      </motion.div>

      
        
        
       
    </div>
  );
}
