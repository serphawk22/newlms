import { SidebarLayoutWrapper } from "@/components/SidebarLayoutWrapper";
import { CompactNavItem } from "@/components/CompactSidebar";
import { getDashboardContext } from "./_lib";
import { LMSAssistantWrapper } from "@/components/LMSAssistantWrapper";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UserCircle,
  BarChart2,
  ClipboardList,
  HelpCircle,
  Video,
  Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userName, userEmail, role } = await getDashboardContext();

  const navItems: CompactNavItem[] = [
    { label: "Dashboard",   href: "/instructor",              icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "My Courses",  href: "/instructor/courses",      icon: <BookOpen className="w-5 h-5" /> },
    { label: "Students",    href: "/instructor/students",     icon: <Users className="w-5 h-5" /> },
    { label: "Analytics",   href: "/instructor/analytics",   icon: <BarChart2 className="w-5 h-5" /> },
    { label: "Certificates",href: "/instructor/certificates", icon: <Award className="w-5 h-5" /> },
    { label: "My Profile",  href: "/instructor/profile",     icon: <UserCircle className="w-5 h-5" /> },
  ];

  return (
    <SidebarLayoutWrapper items={navItems} role={role} userName={userName} userEmail={userEmail}>
      {children}
      {/* Global LMS Assistant — separate from the AI Course Tutor on course pages */}
      <LMSAssistantWrapper userRole={role} userName={userName ?? undefined} />
    </SidebarLayoutWrapper>
  );
}
