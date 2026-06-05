import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export default async function InstructorCertificatesPage() {
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

  // Get all courses created by this instructor
  const instructorCourses = await prisma.course.findMany({
    where: { creatorId: userId },
    select: { id: true },
  });

  const courseIds = instructorCourses.map((c) => c.id);

  const certificates = await prisma.certificate.findMany({
    where: { courseId: { in: courseIds } },
    include: {
      student: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Certificates Issued</h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {certificates.length === 0
              ? "No certificates issued for your courses yet"
              : `${certificates.length} certificate${certificates.length !== 1 ? "s" : ""} across your courses`}
          </p>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
        {certificates.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 0", textAlign: "center" }}>
            <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>No certificates issued yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
              Students who complete your courses at 100% will earn certificates here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary-background)" }}>
                  {["Certificate #", "Student", "Course", "Issue Date", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
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
    </div>
  );
}
