"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Loader2, X, CheckCircle2, AlertCircle, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadToCloudinaryDirect } from "@/lib/uploads";
import { CertificateTemplateMapper, TemplateMappings } from "@/components/CertificateTemplateMapper";

interface CertificateTemplate {
  id: string;
  name: string;
  fileUrl: string;
  isActive: boolean;
  createdAt: string;
  mappings?: TemplateMappings | null;
}

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export function CertificateTemplateManager() {
  const [activeTemplate, setActiveTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showMapper, setShowMapper] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteTemplate = async () => {
    if (!activeTemplate) return;
    if (!confirm(`Are you sure you want to delete the template "${activeTemplate.name}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/certificate-templates?id=${activeTemplate.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Delete failed");
      
      showToast("success", `Template "${activeTemplate.name}" deleted successfully.`);
      setActiveTemplate(null);
      setShowMapper(false);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete template.");
    } finally {
      setDeleting(false);
    }
  };

  const showToast = useCallback((type: Toast["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const fetchTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/certificate-templates?t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const active = data.find((t: CertificateTemplate) => t.isActive);
      setActiveTemplate(active || null);
    } catch {
      showToast("error", "Failed to load template. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
    e.target.value = "";
  };

  const validateAndSetFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      showToast("error", "Only image files (PNG, JPG) are allowed for templates.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) { showToast("error", "File exceeds 10 MB limit."); return; }
    setSelectedFile(f);
  };

  const handleUpload = async () => {
    if (!selectedFile || !name.trim()) {
      showToast("error", "Please enter a name and select a file.");
      return;
    }

    let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    let uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_MATERIALS_PRESET;

    if (!cloudName || !uploadPreset) {
      try {
        const configRes = await fetch("/api/config");
        if (configRes.ok) {
          const configData = await configRes.json();
          cloudName = cloudName || configData.cloudinaryCloudName;
          uploadPreset = uploadPreset || configData.cloudinaryMaterialsPreset;
        }
      } catch (err) {
        console.error("Failed to fetch runtime upload config:", err);
      }
    }

    if (!cloudName || !uploadPreset) {
      showToast("error", "Upload not configured. Contact administrator.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const cloudResult = await uploadToCloudinaryDirect(selectedFile, {
        cloudName,
        preset: uploadPreset,
        onProgress: (pct) => setProgress(pct),
      });

      const res = await fetch("/api/admin/certificate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          fileUrl: cloudResult.secure_url,
        }),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      showToast("success", `Template "${name.trim()}" uploaded! Now configure field positions below.`);
      setName("");
      setSelectedFile(null);
      await fetchTemplate();
      // Auto-open mapper after upload
      setShowMapper(true);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleMappingsSaved = (mappings: TemplateMappings) => {
    if (activeTemplate) {
      setActiveTemplate({ ...activeTemplate, mappings });
    }
    showToast("success", "Field positions saved! Certificates will now use these exact positions.");
  };

  return (
    <div className="space-y-6">
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto transition-all
                ${t.type === "success" ? "bg-[rgba(217,37,42,0.12)] border-[rgba(217,37,42,0.25)] text-[#D9252A]"
                  : t.type === "error" ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-slate-50 border-slate-200 text-slate-700"}`}
            >
              {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-[#D9252A] shrink-0" />}
              {t.type === "error" && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismissToast(t.id)} suppressHydrationWarning
                className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)] mr-2" /> Loading...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top row: current active template + upload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Active Template */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-fit">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Current Active Template</h3>
                  <p className="text-xs text-slate-400 mt-0.5">This template is currently being used for all certificates.</p>
                </div>
                {activeTemplate && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMapper((v) => !v)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${showMapper ? "bg-[#D9252A] text-white border-[#D9252A]" : "bg-white text-[#D9252A] border-[#D9252A] hover:bg-[rgba(217,37,42,0.06)]"}`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {showMapper ? "Hide Editor" : "Edit Field Positions"}
                    </button>
                    <button
                      onClick={handleDeleteTemplate}
                      disabled={deleting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#D9252A] border border-[#D9252A] hover:bg-[rgba(217,37,42,0.08)] transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Template
                    </button>
                  </div>
                )}
              </div>
              <div className="p-6">
                {activeTemplate ? (
                  <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="aspect-[1.414/1] bg-slate-100 relative group overflow-hidden">
                      <img src={activeTemplate.fileUrl} alt={activeTemplate.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={activeTemplate.fileUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                          Preview Full Size
                        </a>
                      </div>
                      {/* Mapping status badge */}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-bold ${activeTemplate.mappings ? "bg-[rgba(217,37,42,0.12)] text-[#D9252A]" : "bg-[#D9252A] text-white"}`}>
                        {activeTemplate.mappings ? "✓ Mapped" : "⚠ Not Mapped"}
                      </div>
                    </div>
                    <div className="p-4 flex flex-col">
                      <p className="font-semibold text-slate-800 text-sm truncate">{activeTemplate.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Uploaded on {new Date(activeTemplate.createdAt).toLocaleDateString()}
                      </p>
                      {!activeTemplate.mappings && (
                        <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                          ⚠ Field positions not configured. Click &quot;Edit Field Positions&quot; to map where student data appears.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-14 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="font-semibold text-slate-400 text-sm">No custom template is active.</p>
                    <p className="text-xs text-slate-400 mt-1">The system is using the default layout.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload New Template */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-fit">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800">Upload New Template</h3>
                <p className="text-xs text-slate-400 mt-0.5">Supports: PNG, JPG — Max 10 MB. This will replace the active template.</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="template-name" className="text-sm font-semibold text-slate-700">
                    Template Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 2026 Classic Template"
                    disabled={uploading}
                    className="bg-white"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    Template Image <span className="text-red-500">*</span>
                  </Label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                      ${isDragging
                        ? "border-[rgba(217,37,42,0.25)] bg-[rgba(217,37,42,0.06)]"
                        : selectedFile
                        ? "border-[rgba(217,37,42,0.25)] bg-[rgba(217,37,42,0.12)]"
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"}
                      ${uploading ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={handleFileChange} disabled={uploading} />

                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="font-semibold text-slate-700 text-sm truncate max-w-xs">{selectedFile.name}</p>
                        {!uploading && (
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                            suppressHydrationWarning
                            className="text-xs text-red-400 hover:text-red-600 transition-colors mt-1">
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div>
                          <p className="font-semibold text-slate-600 text-sm">Drag &amp; drop your template image here</p>
                          <p className="text-xs text-slate-400 mt-0.5">or click to browse from your computer</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {uploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--muted-foreground)]" />
                        Uploading…
                      </span>
                      <span className="font-bold text-[#D9252A]">{progress}%</span>
                    </div>

                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !name.trim()}
                  className="w-full bg-[#D9252A] hover:bg-[#EF4444] text-white font-semibold h-10"
                >
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4 mr-2" />Upload Template</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Field Position Mapper — shown when toggled or after upload */}
          {activeTemplate && showMapper && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3" style={{ backgroundColor: "var(--secondary-background)" }}>
                <Settings className="w-5 h-5 text-[#D9252A]" />
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Field Position Mapping</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure where each field (student name, course name, dates, QR code) appears on the certificate. 
                    Use &quot;Auto-Detect&quot; to scan the template automatically, then fine-tune by dragging.
                  </p>
                </div>
              </div>
              <div className="p-6">
                <CertificateTemplateMapper
                  templateId={activeTemplate.id}
                  templateUrl={activeTemplate.fileUrl}
                  existingMappings={activeTemplate.mappings}
                  onSaved={handleMappingsSaved}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
