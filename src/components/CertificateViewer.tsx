"use client";

import { Download, CheckCircle } from "lucide-react";
import type { TemplateMappings, FieldMapping } from "@/components/CertificateTemplateMapper";

interface CertData {
  certificateNumber: string;
  studentName: string;
  courseName: string;
  completionDate: string;
  courseDuration: string;
  templateUrl?: string | null;
  templateMappings?: TemplateMappings | null;
  instructorName?: string | null;
  organizationName?: string | null;
}

interface Props {
  certData: CertData;
}

// ── Mapped Field Overlay ────────────────────────────────────────────────────

function MappedField({
  fm,
  value,
  isQr,
}: {
  fm: FieldMapping;
  value: string;
  isQr?: boolean;
}) {
  if (!fm.visible) return null;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${fm.x}%`,
    top: `${fm.y}%`,
    width: `${fm.width}%`,
    height: `${fm.height}%`,
    display: "flex",
    alignItems: "center",
    justifyContent:
      fm.align === "left" ? "flex-start" : fm.align === "right" ? "flex-end" : "center",
    textAlign: fm.align,
    overflow: "hidden",
    zIndex: 10,
    // Print-safe
    WebkitPrintColorAdjust: "exact",
    colorAdjust: "exact",
  };

  if (isQr) {
    return (
      <div style={style}>
        <img
          src={value}
          alt="QR Code"
          style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply" }}
        />
      </div>
    );
  }

  return (
    <div style={style}>
      <span
        style={{
          fontSize: `${fm.fontSize}px`,
          color: fm.color || "#1a1a1a",
          fontFamily: "Georgia, 'Times New Roman', serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CertificateViewer({ certData }: Props) {
  const formattedDate = new Date(certData.completionDate).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify-certificate/${certData.certificateNumber}`
      : `https://yourapp.com/verify-certificate/${certData.certificateNumber}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;
  const qrSmallUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(verifyUrl)}`;

  const handlePrint = () => {
    window.print();
  };

  const mappings = certData.templateMappings;
  const hasMappings = !!(certData.templateUrl && mappings);

  return (
    <>
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * { visibility: hidden !important; }
          #certificate-print-area, #certificate-print-area * {
            visibility: visible !important;
          }
          #certificate-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}} />

      {/* Download button */}
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors hover:bg-[#EF4444]" style={{ background: "#D9252A", color: "#FFFFFF" }}
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {/* Certificate */}
      <div
        id="certificate-print-area"
        className="w-full rounded-2xl overflow-hidden border border-[var(--border)] relative"
        style={{ background: "var(--card)", aspectRatio: "1.414 / 1", maxWidth: "900px", margin: "0 auto" }}
      >
        {certData.templateUrl ? (
          /* ── Custom Template Layout ── */
          <div className="absolute inset-0" style={{ background: "var(--card)" }}>
            {/* Template background image */}
            <img
              src={certData.templateUrl}
              alt="Certificate Template"
              className="absolute inset-0 w-full h-full object-fill z-0"
              style={{ WebkitPrintColorAdjust: "exact", colorAdjust: "exact" } as React.CSSProperties}
            />

            {hasMappings ? (
              /* ── Precise Mapped Overlay using saved field positions ── */
              <>
                <MappedField fm={mappings!.studentName} value={certData.studentName.toUpperCase()} />
                <MappedField fm={mappings!.courseName} value={certData.courseName} />
                <MappedField fm={mappings!.completionDate} value={formattedDate} />
                <MappedField fm={mappings!.certificateNumber} value={certData.certificateNumber} />
                <MappedField fm={mappings!.qrCode} value={qrUrl} isQr />
                {mappings!.instructorName && certData.instructorName && (
                  <MappedField fm={mappings!.instructorName} value={certData.instructorName} />
                )}
                {mappings!.organizationName && certData.organizationName && (
                  <MappedField fm={mappings!.organizationName} value={certData.organizationName} />
                )}
                {mappings!.courseDuration && certData.courseDuration && (
                  <MappedField fm={mappings!.courseDuration} value={certData.courseDuration} />
                )}
              </>
            ) : (
              /* ── Fallback centered overlay (no mappings configured) ── */
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-12 pb-12 pt-20">
                <h1
                  className="text-4xl sm:text-5xl font-bold mb-4 tracking-wide"
                  style={{ color: "var(--foreground)", fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}
                >
                  {certData.studentName.toUpperCase()}
                </h1>
                <p className="text-sm mb-2 font-medium" style={{ color: "var(--muted-foreground)" }}>has successfully completed</p>
                <h2
                  className="text-2xl sm:text-3xl font-extrabold mb-8 max-w-2xl"
                  style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}
                >
                  {certData.courseName}
                </h2>
                <div className="flex items-center gap-16 mt-auto">
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{formattedDate}</p>
                    <div className="w-32 h-px bg-zinc-400 my-1 mx-auto"></div>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Date</p>
                  </div>
                  <div className="p-2 rounded-xl border border-[var(--border)]" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(4px)" }}>
                    <img src={qrUrl} alt="QR Code" className="w-24 h-24 object-contain mix-blend-multiply" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{certData.certificateNumber}</p>
                    <div className="w-40 h-px bg-zinc-400 my-1 mx-auto"></div>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Certificate ID</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Default Hardcoded Layout (no template uploaded) ── */
          <div className="flex h-full">
            <div className="flex flex-col items-center justify-between w-[90px] py-8 px-3 flex-shrink-0" style={{ background: "var(--card)" }}>
              <div className="text-center">
                <p className="text-white font-bold text-[9px] tracking-widest uppercase leading-tight mb-3">
                  VERIFIED<br />CERTIFICATE
                </p>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <img src={qrSmallUrl} alt="QR" className="w-14 h-14 mx-auto mb-2 bg-white p-0.5 rounded" />
                <p className="text-white text-[7px] tracking-wide">SCAN TO VERIFY</p>
              </div>
            </div>
            <div className="flex flex-col flex-1 px-8 py-8 justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>Certificate of Completion</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>This is to certify that</p>
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight leading-tight" style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}>
                  {certData.studentName}
                </h1>
                <p className="text-sm mt-2 mb-4" style={{ color: "var(--muted-foreground)" }}>has successfully completed the course</p>
                <h2 className="text-xl font-extrabold mb-1" style={{ color: "var(--foreground)" }}>{certData.courseName}</h2>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Duration: {certData.courseDuration}</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="w-32 h-px bg-zinc-300 mb-1" />
                  <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>{formattedDate}</p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Date of Completion</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{certData.certificateNumber}</p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Certificate ID</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
