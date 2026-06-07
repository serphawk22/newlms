"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Move, Save, RotateCcw, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Scan } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FieldMapping {
  x: number;       // % from left
  y: number;       // % from top
  width: number;   // % of container width
  height: number;  // % of container height
  fontSize: number; // px
  color: string;
  align: "left" | "center" | "right";
  visible: boolean;
  label: string;
}

export interface TemplateMappings {
  studentName: FieldMapping;
  courseName: FieldMapping;
  completionDate: FieldMapping;
  certificateNumber: FieldMapping;
  qrCode: FieldMapping;
  instructorName?: FieldMapping;
  organizationName?: FieldMapping;
  courseDuration?: FieldMapping;
}

const FIELD_LABELS: Record<keyof TemplateMappings, string> = {
  studentName: "Student Name",
  courseName: "Course Name",
  completionDate: "Date",
  certificateNumber: "Certificate ID",
  qrCode: "QR Code",
  instructorName: "Instructor Name",
  organizationName: "Organization",
  courseDuration: "Duration",
};

const FIELD_COLORS: Record<keyof TemplateMappings, string> = {
  studentName: "#2563eb",
  courseName: "#7c3aed",
  completionDate: "#059669",
  certificateNumber: "#d97706",
  qrCode: "#dc2626",
  instructorName: "#0891b2",
  organizationName: "#be185d",
  courseDuration: "#65a30d",
};

const DEFAULT_MAPPINGS: TemplateMappings = {
  studentName:      { x: 25, y: 38, width: 50, height: 7,  fontSize: 28, color: "#1a1a1a", align: "center", visible: true,  label: "Student Name" },
  courseName:       { x: 20, y: 50, width: 60, height: 7,  fontSize: 20, color: "#1a1a1a", align: "center", visible: true,  label: "Course Name" },
  completionDate:   { x: 10, y: 75, width: 25, height: 5,  fontSize: 14, color: "#333333", align: "center", visible: true,  label: "Date" },
  certificateNumber:{ x: 65, y: 75, width: 25, height: 5,  fontSize: 12, color: "#555555", align: "center", visible: true,  label: "Certificate ID" },
  qrCode:           { x: 43, y: 74, width: 14, height: 14, fontSize: 0,  color: "",        align: "center", visible: true,  label: "QR Code" },
  instructorName:   { x: 10, y: 83, width: 30, height: 5,  fontSize: 13, color: "#444444", align: "center", visible: false, label: "Instructor Name" },
  organizationName: { x: 60, y: 83, width: 30, height: 5,  fontSize: 13, color: "#444444", align: "center", visible: false, label: "Organization" },
  courseDuration:   { x: 40, y: 83, width: 20, height: 4,  fontSize: 12, color: "#666666", align: "center", visible: false, label: "Duration" },
};

// ── OCR Keyword Detector ─────────────────────────────────────────────────────

interface OcrHint {
  field: keyof TemplateMappings;
  keywords: string[];
}

const OCR_HINTS: OcrHint[] = [
  { field: "studentName",       keywords: ["student name", "candidate name", "name:", "recipient", "awarded to", "certify that"] },
  { field: "courseName",        keywords: ["course name", "course title", "internship title", "program", "subject", "in the field of"] },
  { field: "completionDate",    keywords: ["date", "issue date", "issued on", "completion date"] },
  { field: "certificateNumber", keywords: ["certificate id", "certificate no", "cert id", "serial", "number:"] },
  { field: "instructorName",    keywords: ["instructor", "trainer", "teacher", "mentor", "signed by"] },
  { field: "organizationName",  keywords: ["organization", "company", "institute", "institution", "academy"] },
  { field: "courseDuration",    keywords: ["duration", "hours", "weeks", "months", "period"] },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  templateId: string;
  templateUrl: string;
  existingMappings?: TemplateMappings | null;
  onSaved: (mappings: TemplateMappings) => void;
}

export function CertificateTemplateMapper({ templateId, templateUrl, existingMappings, onSaved }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [mappings, setMappings] = useState<TemplateMappings>(
    existingMappings ?? DEFAULT_MAPPINGS
  );
  const [selectedField, setSelectedField] = useState<keyof TemplateMappings | null>(null);
  const [dragging, setDragging] = useState<{ field: keyof TemplateMappings; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [resizing, setResizing] = useState<{ field: keyof TemplateMappings; startX: number; startY: number; origW: number; origH: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── OCR: detect placeholder text positions ────────────────────────────────

  const runOcr = useCallback(async () => {
    if (!templateUrl) return;
    setScanning(true);
    setScanResult("Initializing OCR engine...");

    try {
      // Dynamically import tesseract.js to avoid SSR issues
      const Tesseract = await import("tesseract.js");
      setScanResult("Analyzing template image...");

      const result = await Tesseract.recognize(templateUrl, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setScanResult(`OCR progress: ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const words = (result.data as any).words || [];
      const imgEl = imgRef.current;
      if (!imgEl || words.length === 0) {
        setScanResult("OCR complete. No text found. Please adjust markers manually.");
        setScanning(false);
        return;
      }

      const imgW = imgEl.naturalWidth;
      const imgH = imgEl.naturalHeight;
      const detectedFields: Partial<TemplateMappings> = {};

      for (const hint of OCR_HINTS) {
        const lower = result.data.text.toLowerCase();
        const found = hint.keywords.some((kw) => lower.includes(kw));
        if (!found) continue;

        // Find bounding box for the matching word group
        let bestBox: { x0: number; y0: number; x1: number; y1: number } | null = null;
        for (const kw of hint.keywords) {
          const kwWords = kw.split(" ");
          for (let i = 0; i <= words.length - kwWords.length; i++) {
            const slice = words.slice(i, i + kwWords.length);
            const sliceText = slice.map((w: { text: string }) => w.text.toLowerCase()).join(" ");
            if (sliceText.includes(kwWords[0])) {
              const boxes = slice.map((w: { bbox: { x0: number; y0: number; x1: number; y1: number } }) => w.bbox);
              bestBox = {
                x0: Math.min(...boxes.map((b: { x0: number }) => b.x0)),
                y0: Math.min(...boxes.map((b: { y0: number }) => b.y0)),
                x1: Math.max(...boxes.map((b: { x1: number }) => b.x1)),
                y1: Math.max(...boxes.map((b: { y1: number }) => b.y1)),
              };
              break;
            }
          }
          if (bestBox) break;
        }

        if (bestBox) {
          // Convert pixel coords to percentages, then center the field below the detected text
          const xPct = ((bestBox.x0 / imgW) * 100);
          const yPct = ((bestBox.y1 / imgH) * 100) + 1; // place just below the label
          const wPct = Math.max(20, ((bestBox.x1 - bestBox.x0) / imgW) * 100 * 2);
          const existing = mappings[hint.field];
          detectedFields[hint.field] = {
            ...(existing ?? DEFAULT_MAPPINGS[hint.field as keyof typeof DEFAULT_MAPPINGS] as FieldMapping),
            x: Math.min(xPct, 80),
            y: Math.min(yPct, 88),
            width: Math.min(wPct, 60),
            visible: true,
          };
        }
      }

      if (Object.keys(detectedFields).length > 0) {
        setMappings((prev) => ({ ...prev, ...detectedFields }));
        setScanResult(`OCR detected ${Object.keys(detectedFields).length} field(s). Adjust markers as needed.`);
      } else {
        setScanResult("OCR found no matching placeholders. Please drag markers manually.");
      }
    } catch (err) {
      console.error("OCR error:", err);
      setScanResult("OCR failed. Please adjust markers manually.");
    } finally {
      setScanning(false);
    }
  }, [templateUrl, mappings]);

  // ── Drag Logic ────────────────────────────────────────────────────────────

  const getContainerSize = () => {
    const el = containerRef.current;
    if (!el) return { w: 0, h: 0 };
    return { w: el.offsetWidth, h: el.offsetHeight };
  };

  const onMouseDownDrag = (e: React.MouseEvent, field: keyof TemplateMappings) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedField(field);
    setDragging({
      field,
      startX: e.clientX,
      startY: e.clientY,
      origX: mappings[field]!.x,
      origY: mappings[field]!.y,
    });
  };

  const onMouseDownResize = (e: React.MouseEvent, field: keyof TemplateMappings) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      field,
      startX: e.clientX,
      startY: e.clientY,
      origW: mappings[field]!.width,
      origH: mappings[field]!.height,
    });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { w, h } = getContainerSize();
      if (!w || !h) return;

      if (dragging) {
        const dxPct = ((e.clientX - dragging.startX) / w) * 100;
        const dyPct = ((e.clientY - dragging.startY) / h) * 100;
        setMappings((prev) => ({
          ...prev,
          [dragging.field]: {
            ...prev[dragging.field]!,
            x: Math.max(0, Math.min(90, dragging.origX + dxPct)),
            y: Math.max(0, Math.min(92, dragging.origY + dyPct)),
          },
        }));
      }

      if (resizing) {
        const dxPct = ((e.clientX - resizing.startX) / w) * 100;
        const dyPct = ((e.clientY - resizing.startY) / h) * 100;
        setMappings((prev) => ({
          ...prev,
          [resizing.field]: {
            ...prev[resizing.field]!,
            width: Math.max(5, Math.min(80, resizing.origW + dxPct)),
            height: Math.max(3, Math.min(40, resizing.origH + dyPct)),
          },
        }));
      }
    };

    const onUp = () => { setDragging(null); setResizing(null); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, resizing]);

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/certificate-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });
      if (!res.ok) throw new Error("Save failed");
      showToast("success", "Field positions saved successfully!");
      onSaved(mappings);
    } catch {
      showToast("error", "Failed to save field positions.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMappings(existingMappings ?? DEFAULT_MAPPINGS);
    setScanResult("");
  };

  const toggleField = (field: keyof TemplateMappings) => {
    setMappings((prev) => ({
      ...prev,
      [field]: { ...prev[field]!, visible: !prev[field]!.visible },
    }));
  };

  const updateFieldProp = (field: keyof TemplateMappings, prop: keyof FieldMapping, value: string | number | boolean) => {
    setMappings((prev) => ({
      ...prev,
      [field]: { ...prev[field]!, [prop]: value },
    }));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const fieldKeys = Object.keys(FIELD_LABELS) as (keyof TemplateMappings)[];

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === "success" ? "bg-[#D9252A]" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border" style={{ backgroundColor: "var(--secondary-background)", borderColor: "var(--border)" }}>
        <div>
          <h3 className="font-semibold text-zinc-800 text-sm">Field Position Editor</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Drag the colored boxes to match where each field should appear on the certificate</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runOcr}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-[#D9252A] hover:bg-[#EF4444] disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scan className="w-3.5 h-3.5" />}
            {scanning ? "Scanning..." : "Auto-Detect (OCR)"}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#D9252A] hover:bg-[#EF4444] disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : "Save Positions"}
          </button>
        </div>
      </div>

      {/* OCR result */}
      {scanResult && (
        <div className="flex items-center gap-2 text-xs rounded-lg px-4 py-2" style={{ color: "#D9252A", backgroundColor: "rgba(217,37,42,0.06)", border: "1px solid rgba(217,37,42,0.15)" }}>
          <Scan className="w-3.5 h-3.5 flex-shrink-0" />
          {scanResult}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <div
            ref={containerRef}
            className="relative w-full bg-zinc-100 rounded-xl overflow-hidden border-2 border-dashed border-zinc-300 select-none"
            style={{ aspectRatio: "1.414 / 1" }}
          >
            {/* Template Image */}
            <img
              ref={imgRef}
              src={templateUrl}
              alt="Certificate Template"
              className="absolute inset-0 w-full h-full object-contain z-0 pointer-events-none"
              crossOrigin="anonymous"
            />

            {/* Draggable field boxes */}
            {fieldKeys.map((field) => {
              const fm = mappings[field];
              if (!fm || !fm.visible) return null;
              const color = FIELD_COLORS[field];
              const isSelected = selectedField === field;
              return (
                <div
                  key={field}
                  className="absolute z-20 cursor-move group"
                  style={{
                    left: `${fm.x}%`,
                    top: `${fm.y}%`,
                    width: `${fm.width}%`,
                    height: `${fm.height}%`,
                  }}
                  onMouseDown={(e) => onMouseDownDrag(e, field)}
                  onClick={() => setSelectedField(field)}
                >
                  {/* Box border */}
                  <div
                    className="absolute inset-0 rounded border-2 transition-all"
                    style={{
                      borderColor: color,
                      backgroundColor: `${color}22`,
                      boxShadow: isSelected ? `0 0 0 2px ${color}` : undefined,
                    }}
                  />

                  {/* Label */}
                  <div
                    className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap z-30 pointer-events-none"
                    style={{ backgroundColor: color }}
                  >
                    <Move className="inline w-2.5 h-2.5 mr-1" />
                    {fm.label}
                  </div>

                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-30 flex items-center justify-center"
                    style={{ backgroundColor: color, borderRadius: "4px 0 4px 0" }}
                    onMouseDown={(e) => { e.stopPropagation(); onMouseDownResize(e, field); }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                      <path d="M8 0 L8 8 L0 8 Z" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: field controls */}
        <div className="w-full xl:w-72 flex-shrink-0 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-1">Fields</p>
          {fieldKeys.map((field) => {
            const fm = mappings[field];
            if (!fm) return null;
            const color = FIELD_COLORS[field];
            const isSelected = selectedField === field;
            return (
              <div
                key={field}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${isSelected ? "border-[#D9252A] bg-[rgba(217,37,42,0.08)]" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
                onClick={() => setSelectedField(isSelected ? null : field)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-zinc-700">{FIELD_LABELS[field]}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleField(field); }}
                    className={`p-1 rounded transition-colors ${fm.visible ? "text-[#D9252A] hover:bg-[rgba(217,37,42,0.06)]" : "text-zinc-400 hover:bg-zinc-100"}`}
                  >
                    {fm.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isSelected && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-zinc-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wide">X %</label>
                        <input type="number" min={0} max={95} step={0.5} value={Math.round(fm.x * 10) / 10}
                          onChange={(e) => updateFieldProp(field, "x", parseFloat(e.target.value))}
                          className="w-full border border-zinc-200 rounded px-2 py-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Y %</label>
                        <input type="number" min={0} max={95} step={0.5} value={Math.round(fm.y * 10) / 10}
                          onChange={(e) => updateFieldProp(field, "y", parseFloat(e.target.value))}
                          className="w-full border border-zinc-200 rounded px-2 py-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Width %</label>
                        <input type="number" min={5} max={80} step={0.5} value={Math.round(fm.width * 10) / 10}
                          onChange={(e) => updateFieldProp(field, "width", parseFloat(e.target.value))}
                          className="w-full border border-zinc-200 rounded px-2 py-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Height %</label>
                        <input type="number" min={2} max={40} step={0.5} value={Math.round(fm.height * 10) / 10}
                          onChange={(e) => updateFieldProp(field, "height", parseFloat(e.target.value))}
                          className="w-full border border-zinc-200 rounded px-2 py-1 text-xs" />
                      </div>
                    </div>
                    {field !== "qrCode" && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Font px</label>
                          <input type="number" min={8} max={72} value={fm.fontSize}
                            onChange={(e) => updateFieldProp(field, "fontSize", parseInt(e.target.value))}
                            className="w-full border border-zinc-200 rounded px-2 py-1 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Color</label>
                          <input type="color" value={fm.color || "#000000"}
                            onChange={(e) => updateFieldProp(field, "color", e.target.value)}
                            className="w-full h-[26px] border border-zinc-200 rounded cursor-pointer" />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Align</label>
                          <select value={fm.align}
                            onChange={(e) => updateFieldProp(field, "align", e.target.value as "left" | "center" | "right")}
                            className="w-full rounded px-1 py-1 text-xs"
                            style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}>
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
