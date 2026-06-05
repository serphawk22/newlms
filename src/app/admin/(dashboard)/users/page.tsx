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

export interface PendingUserRow {
  id: string;
  name: string | null;
  email: string;
  loginCode: string | null;
  role: "STUDENT" | "INSTRUCTOR";
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
  pendingStudents: PendingUserRow[];
  pendingInstructors: PendingUserRow[];
  instructors: InstructorRow[];
  totalStudents: number;
  totalPendingStudents: number;
  totalPendingInstructors: number;
  totalInstructors: number;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const ctx = await getAdminContext();
  const defaultFilter = (searchParams?.tab === "students" || searchParams?.tab === "instructors")
    ? searchParams.tab
    : "all";

  const [studentMembers, instructorMembers, enrollments, pendingStudents, pendingInstructors] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.orgId, role: "STUDENT", user: { status: { not: "PENDING" } } },
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
      where: { organizationId: ctx.orgId, role: "INSTRUCTOR", user: { status: { not: "PENDING" } } },
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
    // Pending students — all users with PENDING status trying to be students
    prisma.user.findMany({
      where: {
        status: "PENDING",
        OR: [
          { memberships: { some: { organizationId: ctx.orgId, role: "STUDENT" } } },
          { memberships: { none: { organizationId: ctx.orgId } }, loginCode: { startsWith: "STU" } },
        ],
      },
      select: { id: true, name: true, email: true, loginCode: true, status: true },
      orderBy: { id: "desc" },
    }),
    // Pending instructors — all users with PENDING status trying to be instructors
    prisma.user.findMany({
      where: {
        status: "PENDING",
        OR: [
          { memberships: { some: { organizationId: ctx.orgId, role: "INSTRUCTOR" } } },
          { memberships: { none: { organizationId: ctx.orgId } }, loginCode: { startsWith: "INS" } },
        ],
      },
      select: { id: true, name: true, email: true, loginCode: true, status: true },
      orderBy: { id: "desc" },
    }),
  ]);

  // All student members are active (membership = approval)
  const students: StudentRow[] = studentMembers.map((m) => {
    const orgEnrollments = m.user.enrollments.filter((e) => e.course.organizationId === ctx.orgId);
    return {
      id: m.user.id,
      memberId: m.id,
      name: m.user.name,
      email: m.user.email,
      enrolledCourses: orgEnrollments.length,
      completedCourses: orgEnrollments.filter((e) => e.progress >= 100).length,
      lastLogin: "Active session",
      joinedDate: orgEnrollments.length > 0
        ? orgEnrollments.sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime())[0].enrolledAt.toISOString().slice(0, 10)
        : "N/A",
      status: m.user.status,
    };
  });

  const pendingStudentRows: PendingUserRow[] = pendingStudents.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    loginCode: u.loginCode,
    role: "STUDENT",
    status: u.status,
  }));

  const pendingInstructorRows: PendingUserRow[] = pendingInstructors.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    loginCode: u.loginCode,
    role: "INSTRUCTOR",
    status: u.status,
  }));

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
    pendingStudents: pendingStudentRows,
    pendingInstructors: pendingInstructorRows,
    instructors,
    totalStudents: students.length,
    totalPendingStudents: pendingStudentRows.length,
    totalPendingInstructors: pendingInstructorRows.length,
    totalInstructors: instructors.length,
  };

  return <UsersPageClient data={data} defaultFilter={defaultFilter as "all" | "students" | "instructors"} />;
}