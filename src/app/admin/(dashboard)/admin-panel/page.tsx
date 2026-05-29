import { prisma } from "@/lib/prisma";
import { getAdminContext } from "../_lib";
import { Card } from "@/components/ui/card";
import { PanelTop, TrendingUp, Users, BookOpen, MessageSquare } from "lucide-react";
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
      <div className="flex items-center gap-2">
        <PanelTop className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Admin Panel</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Students", value: studentCount, color: "bg-blue-100 text-blue-600" },
          { label: "Instructors", value: instructorCount, color: "bg-emerald-100 text-emerald-600" },
          { label: "Courses", value: courseCount, color: "bg-amber-100 text-amber-600" },
          { label: "Enrollments", value: enrollmentCount, color: "bg-purple-100 text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-zinc-200 shadow-sm">
            <div className="p-4">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xl font-medium text-zinc-900">{stat.value}</p>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="border-zinc-200 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{link.label}</p>
                    <p className="text-xs text-zinc-500">{link.value}</p>
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
