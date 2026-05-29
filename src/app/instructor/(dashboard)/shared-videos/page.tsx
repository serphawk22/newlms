import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { SharedVideosPortal } from "@/components/admin/SharedVideosPortal";

export const dynamic = "force-dynamic";

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export default async function AdminSharedVideosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload;
  try {
    const verified = await jwtVerify(token, getSecret());
    payload = verified.payload;
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    include: { memberships: { include: { organization: true } } },
  });

  if (!user || user.memberships.length === 0) redirect("/login");

  const membership = user.memberships[0];
  
  // Verify user is an ADMIN or INSTRUCTOR
  if (membership.role !== "ADMIN" && membership.role !== "INSTRUCTOR") {
    redirect("/student");
  }

  // Fetch all shared videos from database
  // TODO: Add orgId scoping once schema migration is run
  const videos = await prisma.sharedVideo.findMany({
    // where: { orgId: membership.organizationId },
    orderBy: { createdAt: "desc" },
  });

  // Map dates to strings for Next.js serialization
  const mappedVideos = videos.map((v) => ({
    id: v.id,
    studentName: v.studentName,
    email: v.email,
    videoUrl: v.videoUrl,
    caption: v.caption,
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <SharedVideosPortal initialVideos={mappedVideos} />
    </div>
  );
}
