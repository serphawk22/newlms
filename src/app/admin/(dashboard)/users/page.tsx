import { prisma } from "@/lib/prisma";
import { getAdminContext } from "../_lib";
import { UsersPageClient } from "./users-client";

export const dynamic = "force-dynamic";

export interface StudentRow {
  id: string;
  memberId: string;
  name: string | null;
  email: string;
  enrolledCourses: number;
  completedCourses: number;
  lastLogin: string;
  joinedDate: string;
  status: string;
}

export interface InstructorRow {
  id: string;
  memberId: string;
  name: string | null;
  email: string;
  coursesCreated: number;
  totalStudents: number;
  joinedDate: string;
  lastLogin: string;
  status: string;
}

export interface UsersData {
  students: StudentRow[];
  instructors: InstructorRow[];
  totalStudents: number;
  totalInstructors: number;
}

export default async function AdminUsersPage() {
  const ctx = await getAdminContext();

  const [studentMembers, instructorMembers, enrollments] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.orgId, role: "STUDENT" },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, sessionToken: true, status: true,
            enrollments: { select: { progress: true, enrolledAt: true, course: { select: { organizationId: true } } } },
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
            id: true, name: true, email: true, status: true,
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

  const students: StudentRow[] = studentMembers.map((m) => {
    const orgEnrollments = m.user.enrollments.filter((e) => e.course.organizationId === ctx.orgId);
    return {
      id: m.user.id,
      memberId: m.id,
      name: m.user.name,
      email: m.user.email,
      enrolledCourses: orgEnrollments.length,
      completedCourses: orgEnrollments.filter((e) => e.progress >= 100).length,
      lastLogin: m.user.sessionToken ? "Active session" : "N/A",
      joinedDate: orgEnrollments.length > 0
        ? orgEnrollments.sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime())[0].enrolledAt.toISOString().slice(0, 10)
        : "N/A",
      status: m.user.status,
    };
  });

  const enrollmentsByCreator = new Map<string, number>();
  for (const e of enrollments) {
    const creatorId = e.course.creatorId;
    enrollmentsByCreator.set(creatorId, (enrollmentsByCreator.get(creatorId) || 0) + 1);
  }

  const instructors: InstructorRow[] = instructorMembers.map((m) => ({
    id: m.user.id,
    memberId: m.id,
    name: m.user.name,
    email: m.user.email,
    coursesCreated: m.user.coursesCreated.length,
    totalStudents: enrollmentsByCreator.get(m.user.id) || 0,
    joinedDate: "N/A",
    lastLogin: "N/A",
    status: m.user.status,
  }));

  const data: UsersData = {
    students,
    instructors,
    totalStudents: students.length,
    totalInstructors: instructors.length,
  };

  return <UsersPageClient data={data} />;
}
