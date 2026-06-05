import { SidebarLayoutWrapper } from "@/components/SidebarLayoutWrapper";
import { CompactNavItem } from "@/components/CompactSidebar";
import { getAdminContext } from "./_lib";
import { LMSAssistantWrapper } from "@/components/LMSAssistantWrapper";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  BarChart2,
  PanelTop,
  Settings,
  FolderKanban,
  Award,
  Video,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userName, userEmail } = await getAdminContext();

  const navItems: CompactNavItem[] = [
    { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Users", href: "/admin/users", icon: <Users className="w-5 h-5" /> },
    { label: "All Courses", href: "/admin/all-courses", icon: <FolderKanban className="w-5 h-5" /> },
    { label: "Learning Videos", href: "/admin/learning-videos", icon: <Video className="w-5 h-5" /> },
    { label: "Reports", href: "/admin/reports", icon: <BarChart2 className="w-5 h-5" /> },
    { label: "Certificates", href: "/admin/certificates", icon: <Award className="w-5 h-5" /> },
    { label: "Admin Panel", href: "/admin/admin-panel", icon: <PanelTop className="w-5 h-5" /> },
    { label: "Organization Settings", href: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
    { label: "My Profile", href: "/admin/profile", icon: <UserCircle className="w-5 h-5" /> },
  ];

  return (
    <SidebarLayoutWrapper items={navItems} role="ADMIN" userName={userName} userEmail={userEmail}>
      {children}
      {/* Global LMS Assistant — separate from the AI Course Tutor on course pages */}
      <LMSAssistantWrapper userRole="ADMIN" userName={userName ?? undefined} />
    </SidebarLayoutWrapper>
  );
}
