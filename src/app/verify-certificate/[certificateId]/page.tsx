import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, Calendar, Clock, BookOpen, User, Shield } from "lucide-react";
import Link from "next/link";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;

  let certificate: {
    certificateNumber: string;
    completionDate: Date;
    courseDuration: string;
    student: { name: string | null } | null;
    course: { title: string } | null;
  } | null = null;

  try {
    certificate = await prisma.certificate.findUnique({
      where: { certificateNumber: certificateId },
      include: {
        student: { select: { name: true } },
        course: { select: { title: true } },
      },
    });
  } catch {
    certificate = null;
  }

  const isValid = !!certificate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-emerald-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-900">AllyTech Services</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900">Certificate Verification</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Verify the authenticity of an AllyTech Services certificate
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-zinc-100">
          {isValid ? (
            <>
              {/* Success banner */}
              <div className="bg-emerald-50 border-b border-emerald-100 p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <CheckCircle className="w-12 h-12 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-800">Certificate Verified ✓</h2>
                <p className="text-emerald-600 mt-1 font-medium text-sm">
                  This is a valid official certificate issued by AllyTech Services
                </p>
              </div>

              {/* Details */}
              <div className="p-8">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5" /> Student Name
                    </dt>
                    <dd className="text-lg font-bold text-zinc-900">{certificate!.student?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3.5 h-3.5" /> Course Name
                    </dt>
                    <dd className="text-lg font-bold text-zinc-900">{certificate!.course?.title ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5" /> Completion Date
                    </dt>
                    <dd className="text-lg font-semibold text-zinc-900">
                      {certificate!.completionDate.toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5" /> Certificate Number
                    </dt>
                    <dd className="text-lg font-mono font-bold text-indigo-600">{certificate!.certificateNumber}</dd>
                  </div>
                </dl>
              </div>
            </>
          ) : (
            <div className="p-14 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Certificate Not Found</h2>
              <p className="text-zinc-500 max-w-sm text-sm">
                We could not find a valid certificate matching{" "}
                <span className="font-mono font-semibold text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded">
                  {certificateId}
                </span>
                . Please double-check the certificate ID and try again.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Powered by AllyTech Services LMS •{" "}
          <Link href="/" className="text-emerald-600 hover:underline">
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
