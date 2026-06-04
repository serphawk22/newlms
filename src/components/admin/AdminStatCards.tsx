"use client";
import { useState } from "react";
import { Eye, GraduationCap, Users, BookOpen, BookMarked, TrendingUp } from "lucide-react";
import { AdminStudentModal }    from "@/components/admin/modals/AdminStudentModal";
import { AdminInstructorModal } from "@/components/admin/modals/AdminInstructorModal";
import { AdminEnrollmentModal } from "@/components/admin/modals/AdminEnrollmentModal";

interface AdminStats {
  totalStudents: number;
  activeInstructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
}

type ModalType = "students" | "instructors" | "enrollments" | null;

const CARDS = [
  {
    key: "totalStudents",
    label: "Total Students",
    sub: "in workspace",
    Icon: GraduationCap,
    modal: "students" as ModalType,
  },
  {
    key: "activeInstructors",
    label: "Instructors",
    sub: "in organization",
    Icon: Users,
    modal: "instructors" as ModalType,
  },
  {
    key: "totalCourses",
    label: "Total Courses",
    sub: "in organization",
    Icon: BookOpen,
    modal: null,
  },
  {
    key: "publishedCourses",
    label: "Published Courses",
    sub: "live & accessible",
    Icon: BookMarked,
    modal: null,
  },
  {
    key: "totalEnrollments",
    label: "Total Enrollments",
    sub: "across all courses",
    Icon: TrendingUp,
    modal: "enrollments" as ModalType,
  },
] as const;

export function AdminStatCards({ stats, orgId }: { stats: AdminStats; orgId: string }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {CARDS.map(({ key, label, sub, Icon, modal }) => (
          <div
            key={key}
            className="rounded-2xl p-4 transition-shadow relative group hover:shadow-sm"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Eye button on hoverable cards */}
            {modal && (
              <button
                onClick={() => setActiveModal(modal)}
                className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)" }}
                title={`View ${label}`}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}

            <div
              className="inline-flex p-2 rounded-lg mb-3"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
            >
              <Icon className="h-4 w-4" style={{ color: "var(--foreground)" }} />
            </div>
            <div className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
              {stats[key as keyof AdminStats]}
            </div>
            <p className="text-sm font-semibold mt-0.5 leading-tight" style={{ color: "var(--foreground)" }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{sub}</p>

            {/* Subtle eye hint on cards with modal */}
            {modal && (
              <p className="text-[10px] mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
                <Eye className="w-2.5 h-2.5" /> Click eye to view details
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      {activeModal === "students"    && <AdminStudentModal    orgId={orgId} onClose={() => setActiveModal(null)} />}
      {activeModal === "instructors" && <AdminInstructorModal orgId={orgId} onClose={() => setActiveModal(null)} />}
      {activeModal === "enrollments" && <AdminEnrollmentModal orgId={orgId} onClose={() => setActiveModal(null)} />}
    </>
  );
}
