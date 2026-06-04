"use client";

import { useState } from "react";
import { Eye, CheckCircle2, Gift } from "lucide-react";
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 1rem", textAlign: "center" }}>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>No certificates yet</h3>
        <p className="text-sm" style={{ color: "var(--muted-foreground)", maxWidth: "16rem" }}>
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
            style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Eligible courses - claim certificate */}
          {pendingCourses.map((course) => (
            <div
              key={course.id}
              style={{
                border: "1px solid",
                borderColor: course.status === "DENIED" ? "rgba(217,37,42,0.25)" : "rgba(217,37,42,0.15)",
                borderRadius: "1rem",
                padding: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                background: course.status === "DENIED" ? "rgba(217,37,42,0.06)" : "rgba(217,37,42,0.03)",
              }}
            >
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: course.status === "DENIED" ? "rgba(217,37,42,0.12)" : "rgba(217,37,42,0.08)",
                }}
              >
                <Gift className="w-5 h-5" style={{ color: "#D9252A" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-semibold text-sm" style={{ color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: "#D9252A" }}>
                  {course.status === "DENIED" ? "Certificate Denied" : "Awaiting Instructor Approval"}
                </p>
              </div>
            </div>
          ))}

          {/* Earned certificates */}
          {localCerts.map((cert) => (
            <div
              key={cert.id}
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}
            >
              <div style={{ width: "2.5rem", height: "2.5rem", background: "rgba(217,37,42,0.12)", borderRadius: "0.75rem", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-semibold text-sm" style={{ color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cert.course.title}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.125rem" }}>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(cert.completionDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "#D9252A" }}>{cert.certificateNumber}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  onClick={() => setSelected(cert)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.375rem 0.75rem",
                    background: "var(--secondary-background)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(217,37,42,0.08)"; e.currentTarget.style.borderColor = "#D9252A"; e.currentTarget.style.color = "#D9252A"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--secondary-background)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <a
                  href={`/verify-certificate/${cert.certificateNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.375rem 0.75rem",
                    background: "#D9252A",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#EF4444")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#D9252A")}
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
