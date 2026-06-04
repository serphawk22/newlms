import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { Award, Shield, Image as ImageIcon } from "lucide-react";
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
    <div style={{ background: "var(--background)", minHeight: "100vh", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Certificates</h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Manage certificates and templates</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
        {[
          { key: "issued", icon: Award, label: `Issued Certificates (${certificates.length})` },
          { key: "templates", icon: ImageIcon, label: "Certificate Templates" },
        ].map(({ key, icon: Icon, label }) => (
          <a
            key={key}
            href={`?tab=${key}`}
            className={tab !== key ? "hover:text-[var(--foreground)]" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0 0.25rem 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              borderBottom: "2px solid",
              borderColor: tab === key ? "#D9252A" : "transparent",
              color: tab === key ? "#D9252A" : "var(--muted-foreground)",
              transition: "colors 0.2s",
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </a>
        ))}
      </div>

      {tab === "templates" ? (
        <CertificateTemplateManager />
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
          {certificates.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 0", textAlign: "center" }}>
              <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>No certificates issued yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>Certificates are auto-generated when students complete courses</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                    {["Certificate #", "Student", "Course", "Issued Date", "Duration", "Actions"].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="hover:bg-[rgba(217,37,42,0.04)]"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className="font-mono text-xs font-semibold px-2 py-1 rounded-md"
                          style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}
                        >
                          {cert.certificateNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{cert.student?.name ?? "—"}</p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{cert.student?.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm" style={{ color: "var(--foreground)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cert.course?.title}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
                        {cert.completionDate.toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{cert.courseDuration}</td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`/verify-certificate/${cert.certificateNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[#EF4444]"
                          style={{ background: "#D9252A", color: "#FFFFFF" }}
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
