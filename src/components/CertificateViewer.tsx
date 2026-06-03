"use client";

import { useEffect, useState, useRef } from "react";
import { Award, Download, CheckCircle, Loader2 } from "lucide-react";

interface CertData {
  certificateNumber: string;
  studentName: string;
  courseName: string;
  completionDate: string;
  courseDuration: string;
}

interface Props {
  certData: CertData;
}

export function CertificateViewer({ certData }: Props) {
  const formattedDate = new Date(certData.completionDate).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify-certificate/${certData.certificateNumber}`
      : `https://yourapp.com/verify-certificate/${certData.certificateNumber}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;
  const qrSmallUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(verifyUrl)}`;

  const handlePrint = () => {
    window.print();
  };

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
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {/* Certificate */}
      <div
        id="certificate-print-area"
        className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-100"
        style={{ aspectRatio: "1.414 / 1", maxWidth: "900px", margin: "0 auto" }}
      >
        <div className="flex h-full">
          {/* Left green strip */}
          <div className="flex flex-col items-center justify-between bg-emerald-600 w-[90px] py-8 px-3 flex-shrink-0">
            {/* Verified badge */}
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

            {/* Small QR bottom-left */}
            <div className="bg-white p-1.5 rounded-lg">
              <img src={qrSmallUrl} alt="QR" className="w-14 h-14 object-contain" />
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col px-10 py-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzYgMzRjMC0xLjEuOS0yIDItMnMyIDkgMiAyLS45IDItMiAyLTItLjktMi0yeiIgZmlsbD0iI2U4ZjVlOSIgZmlsbC1vcGFjaXR5PSIuNiIvPjwvZz48L3N2Zz4=')]">

            {/* Top row: Logo + QR */}
            <div className="flex items-start mb-4 relative">
              {/* Left Spacer (to balance QR code and keep logo perfectly centered) */}
              <div className="w-24"></div>
              
              {/* Logo (Centered) */}
              <div className="flex-1 flex justify-center pt-2">
                <img 
                  src="/ally-tech-logo.png" 
                  alt="Ally Tech Services" 
                  className="w-[240px] h-auto object-contain" 
                />
              </div>

              {/* Top-right QR */}
              <div className="bg-white border border-zinc-100 p-1.5 rounded-lg shadow-sm z-10 w-24 flex items-center justify-center">
                <img src={qrUrl} alt="QR Code" className="w-20 h-20 object-contain" />
              </div>
            </div>

            {/* Congratulations */}
            <p className="text-[11px] font-bold tracking-[0.22em] text-zinc-500 uppercase mb-3">
              Congratulations on Completing
            </p>

            {/* Student Name */}
            <h1
              className="text-4xl font-bold text-zinc-900 mb-3 leading-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
            >
              {certData.studentName.toUpperCase()}
            </h1>

            <p className="text-sm text-zinc-500 mb-3">
              has successfully completed the requirements for and awarded a certificate in
            </p>

            {/* Course Name */}
            <h2
              className="text-2xl font-extrabold text-zinc-900 mb-auto"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {certData.courseName}
            </h2>

            {/* Footer */}
            <div className="flex justify-between items-end pt-4 border-t border-zinc-100">
              {/* Left: cert details */}
              <div className="text-sm text-zinc-700">
                <p className="font-bold text-zinc-800 mb-2 font-mono">{certData.certificateNumber}</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-zinc-500">Course completed on</span>
                  <span className="font-bold">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Course Duration</span>
                  <span className="font-bold">{certData.courseDuration}</span>
                </div>
              </div>

              {/* Right: Signature */}
              <div className="text-center">
                <p
                  className="text-2xl text-zinc-700 mb-1"
                  style={{ fontFamily: "'Brush Script MT', cursive, 'Dancing Script', serif", fontStyle: "italic" }}
                >
                  D. Kr. Mehta
                </p>
                <p className="text-sm font-bold text-zinc-900">Deep Kumar Mehta</p>
                <p className="text-xs text-zinc-400">Director, Ally Tech Services</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
