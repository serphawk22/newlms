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
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-2xl">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D9252A" }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: "var(--foreground)" }}>AllyTech Services</span>
          </div>
          <h1 className="text-3xl font-extrabold" style={{ color: "var(--foreground)" }}>Certificate Verification</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Verify the authenticity of an AllyTech Services certificate
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {isValid ? (
            <>
              {/* Success banner */}
              <div className="border-b border-[var(--border)] p-8 flex flex-col items-center text-center" style={{ background: "var(--card)" }}>
                <div className="mb-4">
                  <CheckCircle className="w-12 h-12" style={{ color: "#D9252A" }} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Certificate Verified ✓</h2>
                <p className="mt-1 font-medium text-sm" style={{ color: "var(--muted-foreground)" }}>
                  This is a valid official certificate issued by AllyTech Services
                </p>
              </div>

              {/* Details */}
              <div className="p-8">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1" style={{ color: "var(--muted-foreground)" }}>
                      <User className="w-3.5 h-3.5" /> Student Name
                    </dt>
                    <dd className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{certificate!.student?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1" style={{ color: "var(--muted-foreground)" }}>
                      <BookOpen className="w-3.5 h-3.5" /> Course Name
                    </dt>
                    <dd className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{certificate!.course?.title ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1" style={{ color: "var(--muted-foreground)" }}>
                      <Calendar className="w-3.5 h-3.5" /> Completion Date
                    </dt>
                    <dd className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                      {certificate!.completionDate.toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1" style={{ color: "var(--muted-foreground)" }}>
                      <Clock className="w-3.5 h-3.5" /> Certificate Number
                    </dt>
                    <dd className="text-lg font-mono font-bold" style={{ color: "#D9252A" }}>{certificate!.certificateNumber}</dd>
                  </div>
                </dl>
              </div>
            </>
          ) : (
            <div className="p-14 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(217,37,42,0.12)" }}>
                <XCircle className="w-12 h-12" style={{ color: "#D9252A" }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Certificate Not Found</h2>
              <p className="max-w-sm text-sm" style={{ color: "var(--muted-foreground)" }}>
                We could not find a valid certificate matching{" "}
                <span className="font-mono font-semibold px-1.5 py-0.5 rounded" style={{ color: "var(--foreground)", background: "rgba(255,255,255,0.06)" }}>
                  {certificateId}
                </span>
                . Please double-check the certificate ID and try again.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--muted-foreground)" }}>
          Powered by AllyTech Services LMS •{" "}
            <Link href="/" className="hover:underline" style={{ color: "#D9252A" }}>
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
