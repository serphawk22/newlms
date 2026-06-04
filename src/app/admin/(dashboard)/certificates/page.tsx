import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { Award, Search, Shield, Calendar, BookOpen, User, Image as ImageIcon } from "lucide-react";
import { CertificateTemplateManager } from "@/components/CertificateTemplateManager";
export const dynamic = "force-dynamic";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
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

  if (payload.role !== "ADMIN") redirect("/login");

  const tab = tabParam || "issued";

  const certificates = await prisma.certificate.findMany({
    include: {
      student: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Certificates</h1>
            <p className="text-sm text-gray-500">Manage certificates and templates</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 pb-px">
        <a
          href="?tab=issued"
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
            tab === "issued"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Award className="w-4 h-4" />
          Issued Certificates ({certificates.length})
        </a>
        <a
          href="?tab=templates"
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
            tab === "templates"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Certificate Templates
        </a>
      </div>

      {tab === "templates" ? (
        <CertificateTemplateManager />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Award className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No certificates issued yet</p>
              <p className="text-xs text-gray-400 mt-1">Certificates are auto-generated when students complete courses</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Certificate #</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Student</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Course</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Issued Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Duration</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                          {cert.certificateNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800">{cert.student?.name ?? "—"}</p>
                        <p className="text-xs text-gray-400">{cert.student?.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-gray-700 max-w-[200px] truncate">{cert.course?.title}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {cert.completionDate.toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs">{cert.courseDuration}</td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`/verify-certificate/${cert.certificateNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Shield className="w-3 h-3" />
                          Verify
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
