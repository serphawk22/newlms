import { prisma } from "@/lib/prisma";
import { getAdminContext } from "../_lib";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, BookOpen, MessageSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPanelPage() {
  const ctx = await getAdminContext();

  const [studentCount, instructorCount, courseCount, enrollmentCount, commentCount] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId: ctx.orgId, role: "STUDENT" } }),
    prisma.organizationMember.count({ where: { organizationId: ctx.orgId, role: "INSTRUCTOR" } }),
    prisma.course.count({ where: { organizationId: ctx.orgId } }),
    prisma.enrollment.count({ where: { course: { organizationId: ctx.orgId } } }),
    prisma.adminComment.count({ where: { course: { organizationId: ctx.orgId } } }),
  ]);

  const links = [
    { label: "Users", href: "/admin/users", icon: Users, value: `${studentCount + instructorCount} total` },
    { label: "All Courses", href: "/admin/all-courses", icon: BookOpen, value: `${courseCount} courses` },
    { label: "Reports", href: "/admin/reports", icon: TrendingUp, value: "8 reports" },
    { label: "Admin Comments", href: "/admin", icon: MessageSquare, value: `${commentCount} comments` },
  ];

  return (
    <div className="container-page space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Admin Panel</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Students", value: studentCount, color: "rgba(217,37,42,0.12)" },
          { label: "Instructors", value: instructorCount, color: "rgba(217,37,42,0.12)" },
          { label: "Courses", value: courseCount, color: "rgba(217,37,42,0.12)" },
          { label: "Enrollments", value: enrollmentCount, color: "rgba(217,37,42,0.12)" },
        ].map((stat) => (
          <Card key={stat.label} style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
            <div className="p-4">

              <p className="text-xl font-medium" style={{ color: "var(--foreground)" }}>{stat.value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="transition-all duration-200 cursor-pointer" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,37,42,0.12)" }}>
                    <Icon className="w-5 h-5" style={{ color: "#D9252A" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{link.label}</p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{link.value}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
