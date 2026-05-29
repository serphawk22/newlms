import { prisma } from "@/lib/prisma";
import { getDashboardContext } from "../_lib";
import { AccessDenied } from "@/components/AccessDenied";
import { UsersPageClient } from "./users-client";

export const dynamic = "force-dynamic";

export interface StudentUser {
  id: string;
  name: string | null;
  email: string;
  enrolledCourses: number;
  lastLogin: string;
}

export interface InstructorUser {
  id: string;
  name: string | null;
  email: string;
  coursesCreated: number;
  studentsCount: number;
  joinedDate: string;
}

export interface UsersData {
  students: StudentUser[];
  instructors: InstructorUser[];
  totalStudents: number;
  totalInstructors: number;
}

export default async function UsersPage() {
  const ctx = await getDashboardContext();

  if (ctx.role !== "ADMIN") {
    return (
      <AccessDenied
        title="Admin Access Required"
        description="This section is only available to administrators"
        buttonLabel="Go back"
        buttonHref="/instructor"
      />
    );
  }

  const [studentMembers, instructorMembers, enrollments] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.orgId, role: "STUDENT" },
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            enrollments: { select: { id: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.orgId, role: "INSTRUCTOR" },
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            coursesCreated: {
              where: { organizationId: ctx.orgId },
              include: { _count: { select: { enrollments: true } } },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.enrollment.findMany({
      where: { course: { organizationId: ctx.orgId } },
      select: { courseId: true, course: { select: { creatorId: true } } },
    }),
  ]);

  const students: StudentUser[] = studentMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    enrolledCourses: m.user.enrollments.length,
    lastLogin: "N/A",
  }));

  const enrollmentsByCreator = new Map<string, number>();
  for (const e of enrollments) {
    const creatorId = e.course.creatorId;
    enrollmentsByCreator.set(creatorId, (enrollmentsByCreator.get(creatorId) || 0) + 1);
  }

  const instructors: InstructorUser[] = instructorMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    coursesCreated: m.user.coursesCreated.length,
    studentsCount: enrollmentsByCreator.get(m.user.id) || 0,
    joinedDate: "N/A",
  }));

  const data: UsersData = {
    students,
    instructors,
    totalStudents: students.length,
    totalInstructors: instructors.length,
  };

  return <UsersPageClient data={data} orgId={ctx.orgId} />;
}
