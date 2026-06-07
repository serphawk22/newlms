import { prisma } from "@/lib/prisma";
import { getAdminContext } from "../_lib";
import { Video } from "lucide-react";
import { LearningVideosClient } from "@/components/admin/LearningVideosClient";

export const dynamic = "force-dynamic";

export default async function AdminLearningVideosPage() {
  const ctx = await getAdminContext();

  const videos = await prisma.sharedVideo.findMany({
    orderBy: { createdAt: "desc" },
  });

  const adminReviewVideos = await prisma.adminReviewVideo.findMany({
    orderBy: { uploadedAt: "desc" },
    include: {
      course: true,
      module: true,
      lesson: true,
      instructor: true
    }
  });

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Video className="w-5 h-5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Learning Videos</h1>
        <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: "var(--secondary-background)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
          {videos.length} shared videos
        </span>
      </div>

      <LearningVideosClient 
        initialVideos={videos.map(v => ({
          id: v.id,
          studentName: v.studentName,
          email: v.email,
          videoUrl: v.videoUrl,
          caption: v.caption,
          createdAt: v.createdAt.toISOString()
        }))} 
        initialAdminVideos={adminReviewVideos.map(v => ({
          id: v.id,
          courseName: v.course.title,
          moduleName: v.module.title,
          lessonName: v.lesson.title,
          instructorName: v.instructor.name || "Unknown",
          videoUrl: v.videoUrl,
          status: v.status,
          uploadedAt: v.uploadedAt.toISOString()
        }))}
      />
    </div>
  );
}
