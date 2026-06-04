"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CertificateViewer } from "@/components/CertificateViewer";
import type { TemplateMappings } from "@/components/CertificateTemplateMapper";
import { Loader2 } from "lucide-react";

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

export default function CertificateDownloadPage() {
  const params = useParams();
  const certificateId = params.certificateId as string;

  const [certData, setCertData] = useState<CertData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCert() {
      try {
        // Fetch the verified certificate data
        const verifyRes = await fetch(`/api/certificates/verify/${certificateId}`);
        const verifyJson = await verifyRes.json();

        if (!verifyJson.valid) {
          setError(verifyJson.error || "Certificate not found");
          return;
        }

        const base = verifyJson.data as CertData;

        // Fetch active template + mappings
        const templateRes = await fetch(`/api/admin/certificate-templates?t=${Date.now()}`);
        let templateUrl: string | null = null;
        let templateMappings: TemplateMappings | null = null;

        if (templateRes.ok) {
          const templates = await templateRes.json();
          const active = templates.find((t: { isActive: boolean; fileUrl: string; mappings: TemplateMappings | null }) => t.isActive);
          if (active) {
            templateUrl = active.fileUrl;
            templateMappings = active.mappings ?? null;
          }
        }

        setCertData({ ...base, templateUrl, templateMappings });

        // Auto-trigger print after images load
        setTimeout(() => {
          window.print();
        }, 1500);
      } catch {
        setError("Failed to load certificate");
      }
    }
    fetchCert();
  }, [certificateId]);

  if (error) {
    return (
      <div className="p-10 text-center text-red-500">
        <p className="text-lg font-semibold mb-2">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!certData) {
    return (
      <div className="p-10 text-center text-zinc-500 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p>Generating your certificate...</p>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; background: #fff; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Control bar */}
      <div className="no-print bg-zinc-900 text-white p-4 flex justify-between items-center fixed top-0 w-full z-50">
        <div className="text-sm">Certificate: {certData.certificateNumber}</div>
        <button
          onClick={() => window.print()}
          className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-md font-medium transition-colors text-sm"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="mt-16 print:mt-0 max-w-5xl mx-auto px-4 py-6 print:p-0 print:max-w-none">
        <CertificateViewer certData={certData} />
      </div>
    </>
  );
}
