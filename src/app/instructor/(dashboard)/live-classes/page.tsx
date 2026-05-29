import { prisma } from "@/lib/prisma";
import { getDashboardContext } from "../_lib";
import { LiveClassesPageClient } from "./live-classes-client";

export const dynamic = "force-dynamic";

export interface LiveClassRow {
  id: string;
  title: string;
  courseTitle: string;
  courseId: string;
  scheduledAt: string;
  status: string;
  roomId: string | null;
}

export default async function LiveClassesPage() {
  const ctx = await getDashboardContext();

  const sessions = await prisma.liveSession.findMany({
    where: { course: { creatorId: ctx.userId, organizationId: ctx.orgId } },
    include: { course: { select: { id: true, title: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  const rows: LiveClassRow[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    courseTitle: s.course.title,
    courseId: s.course.id,
    scheduledAt: s.scheduledAt.toISOString(),
    status: s.status,
    roomId: s.roomId,
  }));

  return <LiveClassesPageClient sessions={rows} />;
}
