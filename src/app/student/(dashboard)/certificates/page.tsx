import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { StudentCertificatesClient } from "@/components/StudentCertificatesClient";
import { Award } from "lucide-react";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function StudentCertificatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: import("jose").JWTPayload;
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch {
    redirect("/login");
  }

  const userId = payload.userId as string;

  const [user, certificates, enrollments, activeTemplate] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.certificate.findMany({
      where: { studentId: userId },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { userId, status: "ACTIVE", progress: { gte: 100 } },
      include: { course: { select: { id: true, title: true } } },
    }),
    prisma.certificateTemplate.findFirst({
      where: { isActive: true },
      select: { fileUrl: true, mappings: true },
    }),
  ]);

  // Filter out enrollments that already have an ISSUED certificate
  const certMap = new Map(certificates.map((c) => [c.courseId, c.status]));
  const issuedCertificates = certificates.filter(c => c.status === "ISSUED");

  const eligibleCourses = enrollments
    .filter((e) => certMap.get(e.courseId) !== "ISSUED")
    .map((e) => ({
      id: e.course.id,
      title: e.course.title,
      status: certMap.get(e.courseId) ?? "ELIGIBLE",
    }));

  const serialized = issuedCertificates.map((c) => ({
    id: c.id,
    certificateNumber: c.certificateNumber,
    completionDate: c.completionDate.toISOString(),
    courseDuration: c.courseDuration,
    course: { title: c.course.title },
    templateUrl: activeTemplate?.fileUrl || null,
    templateMappings: (activeTemplate?.mappings as Record<string, unknown> | null) ?? null,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow">
          <Award className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Certificates</h1>
          <p className="text-sm text-gray-500">
            {issuedCertificates.length === 0 && eligibleCourses.length === 0
              ? "Complete courses to earn certificates"
              : `${issuedCertificates.length} certificate${issuedCertificates.length !== 1 ? "s" : ""} earned`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <StudentCertificatesClient
          certificates={serialized}
          studentName={user?.name ?? "Student"}
          eligibleCourses={eligibleCourses}
        />
      </div>
    </div>
  );
}
