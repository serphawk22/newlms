import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import StudentCoursesClient from "./courses-client";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function StudentCoursesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload;
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    select: {
      id: true,
      memberships: {
        select: { organizationId: true },
        take: 1,
      },
    },
  });

  if (!user || user.memberships.length === 0) redirect("/login");
  const orgId = user.memberships[0].organizationId;

  // Fetch all published courses in the organization sequentially
  const allCourses = await prisma.course.findMany({
    where: {
      organizationId: orgId,
      published: true,
    },
    include: {
      creator: { select: { name: true } },
      _count: { select: { modules: true, enrollments: true } }
    },
    orderBy: { id: "desc" }
  });

  // Fetch student's enrollments with status
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          published: true,
          joinQuestions: true,
        }
      }
    }
  });

  // Create enrollment map for quick lookup
  const enrollmentMap = new Map(
    enrollments.map(e => [e.courseId, { status: e.status, progress: e.progress }])
  );

  // Prepare courses with enrollment status
  const coursesWithStatus = allCourses.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    instructorName: course.creator.name || "Unknown",
    modulesCount: course._count.modules,
    enrollmentsCount: course._count.enrollments,
    enrollmentStatus: enrollmentMap.get(course.id)?.status || null,
    progress: enrollmentMap.get(course.id)?.progress || 0,
    hasJoinQuestions: Array.isArray(course.joinQuestions) && (course.joinQuestions as any[]).length > 0,
  }));

  // Prepare my courses data (ACTIVE enrollments only)
  const activeCourses = enrollments
    .filter(e => e.status === "ACTIVE" && e.course.published)
    .map(e => ({
      id: e.course.id,
      title: e.course.title,
      description: e.course.description,
      progress: Math.round(e.progress),
    }));

  const pendingCourses = enrollments
    .filter(e => e.status === "PENDING" && e.course.published)
    .map(e => ({
      id: e.course.id,
      title: e.course.title,
      hasJoinQuestions: Array.isArray(e.course.joinQuestions) && (e.course.joinQuestions as any[]).length > 0,
    }));

  const rejectedCourses = enrollments
    .filter(e => e.status === "REJECTED" && e.course.published)
    .map(e => ({
      id: e.course.id,
      title: e.course.title,
      hasJoinQuestions: Array.isArray(e.course.joinQuestions) && (e.course.joinQuestions as any[]).length > 0,
    }));

  return (
    <StudentCoursesClient
      allCourses={coursesWithStatus}
      activeCourses={activeCourses}
      pendingCourses={pendingCourses}
      rejectedCourses={rejectedCourses}
    />
  );
}
