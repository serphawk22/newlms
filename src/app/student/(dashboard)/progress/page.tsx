import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { StudentProgressClient } from "@/components/StudentProgressClient";
import { StudentCertificatesClient } from "@/components/StudentCertificatesClient";
import { Award } from "lucide-react";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function StudentProgressPage() {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: { userId?: string; name?: string } = {};
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as typeof payload;
  } catch {
    redirect("/login");
  }

  const userId = payload.userId ?? "";
  if (!userId) redirect("/login");

  // ── Sequential Queries to avoid Neon connection spike ──────────────────────
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          published: true,
          _count: {
            select: {
              modules: true,
              assignments: true,
              quizzes: true,
              readingMaterials: true,
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const activeEnrollments = enrollments.filter((e) => e.course.published);
  const courseIds = activeEnrollments.map((e) => e.course.id);

  // Fetch student activity per course to compute real progress
  const [assignmentSubmissions, quizSubmissions, materialViews, loginNotifications] =
    await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: { studentId: userId, assignment: { courseId: { in: courseIds } } },
        select: { submittedAt: true, assignment: { select: { courseId: true } } },
        orderBy: { submittedAt: "asc" },
      }),
      prisma.quizSubmission.findMany({
        where: { studentId: userId, quiz: { courseId: { in: courseIds } } },
        select: { submittedAt: true, obtainedMarks: true, quiz: { select: { courseId: true } } },
        orderBy: { submittedAt: "asc" },
      }),
      prisma.materialView.findMany({
        where: { studentId: userId, material: { courseId: { in: courseIds } } },
        select: { materialId: true, material: { select: { courseId: true } } },
      }),
      prisma.notification.findMany({
        where: { userId, type: "LOGIN" },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  // ── Certificates & Templates ──────────────────────────────────────────────
  const [user, certificates, activeTemplate] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.certificate.findMany({
      where: { studentId: userId },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.certificateTemplate.findFirst({
      where: { isActive: true },
      select: { fileUrl: true, mappings: true },
    }),
  ]);

  // ── Build per-course activity maps ──────────────────────────────────────
  const asgByCourse = new Map<string, number>();
  for (const s of assignmentSubmissions) {
    const cid = s.assignment.courseId;
    asgByCourse.set(cid, (asgByCourse.get(cid) ?? 0) + 1);
  }

  const qzByCourse = new Map<string, number>();
  for (const s of quizSubmissions) {
    const cid = s.quiz.courseId;
    qzByCourse.set(cid, (qzByCourse.get(cid) ?? 0) + 1);
  }

  const matByCourse = new Map<string, Set<string>>();
  for (const v of materialViews) {
    const cid = v.material.courseId;
    if (!matByCourse.has(cid)) matByCourse.set(cid, new Set());
    matByCourse.get(cid)!.add(v.materialId);
  }

  function getRealProgress(courseId: string, totalAsg: number, totalQz: number, totalMat: number): number {
    const total = totalAsg + totalQz + totalMat;
    if (total === 0) return 0;
    const done =
      (asgByCourse.get(courseId) ?? 0) +
      (qzByCourse.get(courseId) ?? 0) +
      (matByCourse.get(courseId)?.size ?? 0);
    return Math.min(Math.round((done / total) * 100), 100);
  }

  // ── Compute real per-course progress ─────────────────────────────────────
  const coursesWithProgress = activeEnrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    progress: getRealProgress(
      e.course.id,
      e.course._count.assignments,
      e.course._count.quizzes,
      e.course._count.readingMaterials,
    ),
    moduleCount: e.course._count.modules,
  }));

  const totalEnrolled = activeEnrollments.length;

  const completedCourses = coursesWithProgress.filter((c) => c.progress >= 100).length;

  const estimatedCompletedModules = coursesWithProgress.reduce((sum, c) => {
    const pct = Math.min(c.progress, 100) / 100;
    return sum + Math.floor(pct * c.moduleCount);
  }, 0);

  const certMap = new Map(certificates.map((c) => [c.courseId, c.status]));
  const issuedCertificates = certificates.filter((c) => c.status === "ISSUED");

  const serializedCerts = issuedCertificates.map((c) => ({
    id: c.id,
    certificateNumber: c.certificateNumber,
    completionDate: c.completionDate.toISOString(),
    courseDuration: c.courseDuration,
    course: { title: c.course.title },
    templateUrl: activeTemplate?.fileUrl || null,
    templateMappings: (activeTemplate?.mappings as Record<string, unknown> | null) ?? null,
  }));

  const completedAssignments = assignmentSubmissions.length;
  const assignmentDates = assignmentSubmissions.map((s) => s.submittedAt.toISOString());
  const completedQuizzes = quizSubmissions.length;
  const quizDates = quizSubmissions.map((s) => s.submittedAt.toISOString());

  const points = quizSubmissions.reduce((sum, s) => sum + (s.obtainedMarks ?? 0), 0);
  const level = Math.floor(points / 50) + 1;
  const loginDates = loginNotifications.map((n) => n.createdAt.toISOString());

  // Eligible courses: completed (100%) but not yet ISSUED certificate
  const eligibleCourses = coursesWithProgress
    .filter((c) => c.progress >= 100 && certMap.get(c.id) !== "ISSUED")
    .map((c) => ({
      id: c.id,
      title: c.title,
      status: certMap.get(c.id) ?? "ELIGIBLE",
    }));

  return (
    <div>
      <StudentProgressClient
        totalEnrolled={totalEnrolled}
        completedCourses={completedCourses}
        estimatedCompletedModules={estimatedCompletedModules}
        completedAssignments={completedAssignments}
        completedQuizzes={completedQuizzes}
        loginDates={loginDates}
        quizSubmissionDates={quizDates}
        assignmentSubmissionDates={assignmentDates}
        courses={coursesWithProgress}
        points={points}
        level={level}
      />

      {/* ── Earned Certificates ─────────────────────────────────────────────── */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Earned Certificates</h2>
              <p className="text-xs text-gray-400">
                {serializedCerts.length === 0 && eligibleCourses.length === 0
                  ? "Complete a course at 100% to earn your first certificate"
                  : `${serializedCerts.length} certificate${serializedCerts.length !== 1 ? "s" : ""} earned`}
              </p>
            </div>
          </div>
          <StudentCertificatesClient
            certificates={serializedCerts}
            studentName={user?.name ?? "Student"}
            eligibleCourses={eligibleCourses}
          />
        </div>
      </div>
    </div>
  );
}
