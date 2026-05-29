import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import { UsersTable } from "../_components/users-table";
import { PageWrapper } from "../_components/page-wrapper";
import { getInstructorOrgContext } from "../_lib";
import { AccessDenied } from "@/components/AccessDenied";

async function UsersPageContent() {
  const { orgId } = await getInstructorOrgContext();

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          enrollments: {
            select: {
              progress: true,
              course: { select: { title: true } },
            },
          },
        },
      },
    },
    orderBy: { role: "asc" },
  });

  const userRows = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    coursesEnrolled: m.user.enrollments.length,
    coursesCompleted: m.user.enrollments.filter((e) => e.progress >= 100).length,
    registeredAt: "N/A",
    enrolledCourses: m.user.enrollments.map((e) => ({
      title: e.course.title,
      progress: e.progress,
    })),
  }));

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Users Report</h1>
        <span className="ml-auto text-xs text-zinc-400">{userRows.length} users</span>
      </div>
      <UsersTable users={userRows} orgId={orgId} />
    </PageWrapper>
  );
}

export default async function UsersPage() {
  const { role } = await getInstructorOrgContext();
  if (role !== "ADMIN") {
    return (
      <AccessDenied
        title="Admin Access Required"
        description="This section is only available to administrators"
        buttonLabel="Go back"
        buttonHref="/instructor"
      />
    );
  }
  return <UsersPageContent />;
}
