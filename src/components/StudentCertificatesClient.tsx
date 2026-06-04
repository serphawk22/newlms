"use client";

import { useState } from "react";
import { Award, Download, Eye, CheckCircle2, Loader2, Gift } from "lucide-react";
import { CertificateViewer } from "./CertificateViewer";

interface Certificate {
  id: string;
  certificateNumber: string;
  completionDate: string;
  courseDuration: string;
  course: { title: string };
  templateUrl?: string | null;
  templateMappings?: Record<string, unknown> | null;
}

interface EligibleCourse {
  id: string;
  title: string;
  status: string; // "ELIGIBLE" | "DENIED"
}

interface Props {
  certificates: Certificate[];
  studentName: string;
  eligibleCourses?: EligibleCourse[]; // courses at 100% without a certificate yet
}

export function StudentCertificatesClient({ certificates, studentName, eligibleCourses = [] }: Props) {
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [localCerts, setLocalCerts] = useState<Certificate[]>(certificates);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [pendingCourses, setPendingCourses] = useState<EligibleCourse[]>(eligibleCourses);

  const isEmpty = localCerts.length === 0 && pendingCourses.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
          <Award className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-800 mb-1">No certificates yet</h3>
        <p className="text-sm text-zinc-400 max-w-xs">
          Complete a course at 100% to earn your first certificate!
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Certificate Viewer */}
      {selected && (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            ← Back to certificates
          </button>
          <CertificateViewer
            certData={{
              certificateNumber: selected.certificateNumber,
              studentName,
              courseName: selected.course.title,
              completionDate: selected.completionDate,
              courseDuration: selected.courseDuration,
              templateUrl: selected.templateUrl,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              templateMappings: (selected.templateMappings as any) ?? null,
            }}
          />
        </div>
      )}

      {!selected && (
        <div className="space-y-3">
          {/* Eligible courses - claim certificate */}
          {pendingCourses.map((course) => (
            <div
              key={course.id}
              className={`border rounded-2xl p-4 flex items-center gap-4 ${course.status === "DENIED" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${course.status === "DENIED" ? "bg-red-100" : "bg-amber-100"}`}>
                <Gift className={`w-5 h-5 ${course.status === "DENIED" ? "text-red-600" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-zinc-900 truncate">{course.title}</p>
                <p className={`text-xs mt-0.5 font-medium ${course.status === "DENIED" ? "text-red-600" : "text-amber-600"}`}>
                  {course.status === "DENIED" ? "Certificate Denied" : "Awaiting Instructor Approval"}
                </p>
              </div>
            </div>
          ))}

          {/* Earned certificates */}
          {localCerts.map((cert) => (
            <div
              key={cert.id}
              className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-zinc-900 truncate">{cert.course.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-zinc-400">
                    {new Date(cert.completionDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </span>
                  <span className="text-xs font-mono text-indigo-500">{cert.certificateNumber}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setSelected(cert)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium transition-colors border border-zinc-200"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <a
                  href={`/verify-certificate/${cert.certificateNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition-colors border border-emerald-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verify
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
