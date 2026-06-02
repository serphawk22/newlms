"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

export default function CertificateDownloadPage() {
  const params = useParams();
  const certificateId = params.certificateId as string;

  const [certData, setCertData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCert() {
      try {
        const res = await fetch(`/api/certificates/verify/${certificateId}`);
        const data = await res.json();
        if (data.valid) {
          setCertData(data.data);
          // Wait a moment for images to load, then trigger print
          setTimeout(() => {
            window.print();
          }, 1000);
        } else {
          setError(data.error || "Certificate not found");
        }
      } catch (err) {
        setError("Failed to load certificate");
      }
    }
    fetchCert();
  }, [certificateId]);

  if (error) {
    return <div className="p-10 text-center text-red-500">{error}</div>;
  }

  if (!certData) {
    return <div className="p-10 text-center text-zinc-500">Generating your certificate...</div>;
  }

  // Use a public QR code generation API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `${window.location.origin}/verify-certificate/${certificateId}`
  )}`;

  const formattedDate = new Date(certData.completionDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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

      {/* Control bar for users who cancel print and want to retry */}
      <div className="no-print bg-zinc-900 text-white p-4 flex justify-between items-center fixed top-0 w-full z-50">
        <div>Certificate: {certData.certificateNumber}</div>
        <button 
          onClick={() => window.print()}
          className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-md font-medium transition-colors"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="w-[1122px] h-[793px] relative overflow-hidden bg-white mt-16 print:mt-0 print:absolute print:top-0 print:left-0 origin-top-left mx-auto shadow-2xl print:shadow-none">
        
        {/* The Master Certificate Template Background (Assumed location) */}
        {/* If the image is not available, we use a styled fallback that matches the requested design */}
        <div className="absolute inset-0 z-0 bg-[#f4fcf7] flex">
          <div className="w-[80px] h-full bg-[#1e9d56]"></div>
          <div className="flex-1 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>

        {/* Verification Badge */}
        <div className="absolute left-6 top-16 z-10 flex flex-col items-center">
          <p className="text-[#3b8764] font-bold text-[10px] tracking-widest text-center leading-tight mb-2">VERIFIED<br/>CERTIFICATE</p>
          <div className="w-24 h-24 bg-[#a7d3b5] rounded-full flex items-center justify-center p-2">
             <div className="w-full h-full bg-[#67a780] rounded-full flex items-center justify-center shadow-inner">
               <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
             </div>
          </div>
        </div>

        {/* Small QR Bottom Left */}
        <div className="absolute left-8 bottom-12 z-10 p-2 bg-white rounded shadow-sm">
           <img src={qrUrl} alt="QR Code" className="w-16 h-16 object-contain" />
        </div>

        {/* Main Content Area */}
        <div className="absolute inset-0 z-10 pl-[160px] pr-16 py-16 flex flex-col items-center text-center">
          
          {/* Logo (Placeholder text, ideally use an image) */}
          <div className="mb-4 mt-4 flex items-baseline justify-center">
             <span className="text-4xl font-black italic text-zinc-800 tracking-tighter">Ally</span>
             <span className="text-4xl font-bold italic text-zinc-500 tracking-tight ml-1">Tech</span>
          </div>
          <span className="text-red-600 font-bold tracking-wider text-sm -mt-2 mb-6">Services</span>

          <h2 className="text-[11px] font-bold tracking-[0.2em] text-zinc-600 mb-8 uppercase">
            Congratulations on Completing
          </h2>

          {/* Student Name */}
          <h1 className="text-5xl font-serif italic text-zinc-900 mb-6" style={{ fontFamily: "Georgia, serif" }}>
            {certData.studentName.toUpperCase()}
          </h1>

          <p className="text-sm text-zinc-500 mb-6 font-medium">
            has successfully completed the requirements for and awarded a certificate in
          </p>

          {/* Course Name */}
          <h2 className="text-3xl font-black text-zinc-900 mb-auto font-serif tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
            {certData.courseName.toUpperCase()}
          </h2>

          {/* Bottom Details Grid */}
          <div className="w-full flex justify-between items-end mb-4 pr-12">
            
            <div className="text-left">
               <p className="text-xs font-bold text-zinc-800 mb-4">{certData.certificateNumber}</p>
               <div className="grid grid-cols-[140px_1fr] gap-2 text-[13px] font-medium text-zinc-800 mb-1">
                 <span>Course completed on</span>
                 <span className="font-bold">{formattedDate}</span>
               </div>
               <div className="grid grid-cols-[140px_1fr] gap-2 text-[13px] font-medium text-zinc-800">
                 <span>Course Duration</span>
                 <span className="font-bold">{certData.courseDuration}</span>
               </div>
            </div>

            {/* Signature Area */}
            <div className="text-center flex flex-col items-center">
               <div className="text-3xl font-serif italic text-zinc-800 mb-2 opacity-80" style={{ fontFamily: "'Brush Script MT', cursive, serif" }}>
                 D. Kr. Mehta
               </div>
               <p className="text-[13px] font-bold text-zinc-900">Deep Kumar Mehta</p>
               <p className="text-[10px] text-zinc-500 mt-1">Director, Ally Tech Services</p>
            </div>
            
          </div>
        </div>

        {/* Top Right QR Code */}
        <div className="absolute right-12 top-12 z-10 bg-white p-2">
           <img src={qrUrl} alt="QR Code" className="w-24 h-24 object-contain" />
        </div>
      </div>
    </>
  );
}
