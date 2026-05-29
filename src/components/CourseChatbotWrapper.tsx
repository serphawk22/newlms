"use client";

import dynamic from "next/dynamic";

const CourseChatbot = dynamic(() => import("@/components/CourseChatbot").then((m) => m.CourseChatbot), { ssr: false });

export function CourseChatbotWrapper({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  return <CourseChatbot courseId={courseId} courseTitle={courseTitle} />;
}
