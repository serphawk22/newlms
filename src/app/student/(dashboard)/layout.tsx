import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { SidebarLayoutWrapper } from "@/components/SidebarLayoutWrapper";
import { CompactNavItem } from "@/components/CompactSidebar";
import { LMSAssistantWrapper } from "@/components/LMSAssistantWrapper";
import {
  LayoutDashboard, BookOpen, Video, Brain, UserCircle, BarChart3, Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const { name, email, organizationName } = payload as {
    userId: string; name: string; email: string;
    organizationName: string; role: string;
  };

  const navItems: CompactNavItem[] = [
    { label: "Dashboard",         href: "/student",                 icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Available Courses", href: "/student/courses",         icon: <BookOpen className="w-4 h-4" /> },
    { label: "Live Classes",      href: "/student/live",            icon: <Video className="w-4 h-4" /> },
    { label: "Study Friend",      href: "/student/study-friend",    icon: <Brain className="w-4 h-4" /> },
    { label: "My Progress",       href: "/student/progress",        icon: <BarChart3 className="w-4 h-4" /> },
    { label: "My Certificates",   href: "/student/certificates",    icon: <Award className="w-4 h-4" /> },
    { label: "My Profile",        href: "/student/profile",         icon: <UserCircle className="w-4 h-4" /> },
  ];

  return (
    <SidebarLayoutWrapper
      items={navItems}
      role="STUDENT"
      userName={name ?? "Student"}
      userEmail={email}
    >
      {children}
      {/* Global LMS Assistant — separate from the AI Course Tutor on course pages */}
      <LMSAssistantWrapper userRole="STUDENT" userName={name ?? undefined} />
    </SidebarLayoutWrapper>
  );
}
