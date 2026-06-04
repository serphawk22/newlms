"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock } from "lucide-react";
import BarsLoader from "@/components/ui/bars-loader";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getCourseBannerUrl, DEFAULT_COURSE_BANNER } from "@/lib/course-images";

interface Course {
  id: string;
  title: string;
  orgName: string;
  enrolled: boolean;
}

export function CourseCard({ course }: { course: Course }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enrolled, setEnrolled] = useState(course.enrolled);
  const [enrolling, setEnrolling] = useState(false);
  const bannerUrl = getCourseBannerUrl(course.title);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      if (res.ok) {
        setEnrolled(true);
        startTransition(() => router.refresh());
      }
    } catch {
      /* enrollment state unchanged */
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <Card
      className="h-full overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <div className="relative w-full h-32 overflow-hidden">
        <img
          src={bannerUrl}
          alt=""
          className="w-full h-full object-cover rounded-t-xl"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_COURSE_BANNER;
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, color-mix(in srgb, var(--foreground) 55%, transparent), transparent 50%)",
          }}
        />
        <h4
          className="absolute bottom-3 left-4 right-4 text-sm font-semibold text-white line-clamp-2"
        >
          {course.title}
        </h4>
      </div>
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{course.orgName}</span>
            {enrolled && (
              <span className="status-badge status-badge--success py-0 px-2 shrink-0">
                Enrolled
              </span>
            )}
          </div>
        </div>

        {enrolled ? (
          <Link href={`/student/courses/${course.id}`}>
            <Button variant="ghost" size="sm" className="font-semibold text-xs shrink-0">
              Continue <ChevronRight className="w-4 h-4 ml-0.5" />
            </Button>
          </Link>
        ) : (
          <Button
            onClick={handleEnroll}
            disabled={enrolling || isPending}
            size="sm"
            className="shrink-0 font-semibold text-xs"
          >
            {enrolling ? (
              <>
                <BarsLoader size="sm" /> Enrolling…
              </>
            ) : (
              "Enroll Now"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
