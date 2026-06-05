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

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center gap-2">
        <Video className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Learning Videos</h1>
        <span className="ml-auto text-xs font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
          {videos.length} shared videos
        </span>
      </div>

      <LearningVideosClient initialVideos={videos.map(v => ({
        id: v.id,
        studentName: v.studentName,
        email: v.email,
        videoUrl: v.videoUrl,
        caption: v.caption,
        createdAt: v.createdAt.toISOString()
      }))} />
    </div>
  );
}
