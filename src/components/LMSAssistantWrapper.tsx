"use client";

/**
 * LMSAssistantWrapper
 *
 * Lazy-loads the LMSAssistant chatbot and suppresses it on pages that already
 * have the existing AI Course Tutor (i.e. /student/courses/[courseId]).
 *
 * ⚠️  Do NOT modify or reference CourseChatbot or CourseChatbotWrapper here.
 *     This wrapper is completely separate from the existing AI Course Tutor.
 */

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Lazy-load: only download the bundle when the user first opens the chat
const LMSAssistant = dynamic(
  () => import("@/components/LMSAssistant").then((m) => m.LMSAssistant),
  { ssr: false }
);

interface LMSAssistantWrapperProps {
  userRole: string;
  userName?: string;
}

/** Routes on which the Global LMS Assistant should NOT appear.
 *  Uses a simple prefix/pattern match against window.location.pathname.
 */
const EXCLUDED_PATH_PATTERNS: RegExp[] = [
  // Student course pages — the existing AI Course Tutor lives here
  /^\/student\/courses\/[^/]+/,
];

export function LMSAssistantWrapper({ userRole, userName }: LMSAssistantWrapperProps) {
  const pathname = usePathname();

  // Hide on excluded paths (e.g. student course detail pages)
  const isExcluded = EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(pathname ?? ""));
  if (isExcluded) return null;

  return <LMSAssistant userRole={userRole} userName={userName} />;
}
