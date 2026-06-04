"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { uploadToCloudinaryDirect } from "@/lib/uploads";
import { Settings, CheckCircle2, AlertCircle, Upload, X } from "lucide-react";
import { RingLoader } from "@/components/ui/ring-loader";
import { cn } from "@/lib/utils";

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  timezone: string;
  registrationMode: string;
}

interface CloudinaryConfig {
  cloudinaryCloudName: string | null;
  cloudinaryMaterialsPreset: string | null;
  cloudinarySubmissionsPreset: string | null;
}

type Toast = { message: string; type: "success" | "error" } | null;

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const [cloudinaryConfig, setCloudinaryConfig] = useState<CloudinaryConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [registrationMode, setRegistrationMode] = useState("open");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/config").then((r) => r.json()),
    ])
      .then(([settingsData, configData]) => {
        if (settingsData.error) {
          router.push("/admin/login");
          return;
        }
        setSettings(settingsData);
        setOrgName(settingsData.name);
        setLogoUrl(settingsData.logo);
        setRegistrationMode(settingsData.registrationMode);
        setCloudinaryConfig(configData);
      })
      .catch(() => {
        showToast("Failed to load settings.", "error");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cloudinaryConfig?.cloudinaryCloudName) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast("Logo must be under 2MB.", "error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Only image files are allowed.", "error");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const preset = cloudinaryConfig.cloudinaryMaterialsPreset || "lms_materials";
      const result = await uploadToCloudinaryDirect(file, {
        preset,
        cloudName: cloudinaryConfig.cloudinaryCloudName!,
        onProgress: (pct) => setUploadProgress(pct),
      });
      setLogoUrl(result.secure_url);
      showToast("Logo uploaded successfully.", "success");
    } catch (err: any) {
      showToast(err?.message || "Logo upload failed.", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
  };

  const handleSave = async () => {
    if (!orgName.trim()) {
      showToast("Organization name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName.trim(),
          logo: logoUrl,
          registrationMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      showToast("Settings saved successfully.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="ring" size="lg" />
      </div>
    );
  }

  if (!settings) {
    return <div className="text-center py-12" style={{ color: "var(--muted-foreground)" }}>Organization not found.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="container-page max-w-2xl space-y-6"
    >
      {toast && (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border transition-all duration-300",
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Organization Settings</h1>
      </div>

      <Card className="p-6" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Organization Name
            </Label>
            <Input
              id="name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Slug
            </Label>
            <Input
              id="slug"
              value={settings.slug}
              disabled
              style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            />
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Slug cannot be changed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo" className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Organization Logo
            </Label>
            {logoUrl && (
              <div className="relative inline-block">
                <img
                  src={logoUrl}
                  alt="Organization Logo"
                  className="w-24 h-24 object-cover rounded-lg"
                  style={{ border: "1px solid var(--border)" }}
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 text-white rounded-full p-0.5 shadow hover:bg-red-600"
                  style={{ background: "#D9252A" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Input
                ref={fileInputRef}
                id="logo"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={handleLogoUpload}
                style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] file:cursor-pointer"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
                  <Upload className="w-4 h-4 animate-pulse" />
                  <span>{uploadProgress}%</span>
                </div>
              )}
            </div>
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Max 2MB. Uploads directly to Cloudinary.</p>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Registration Mode
            </Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
                <input
                  type="radio"
                  name="regMode"
                  value="open"
                  checked={registrationMode === "open"}
                  onChange={() => setRegistrationMode("open")}
                  className="accent-zinc-900 cursor-pointer"
                />
                Open Registration
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
                <input
                  type="radio"
                  name="regMode"
                  value="invite"
                  checked={registrationMode === "invite"}
                  onChange={() => setRegistrationMode("invite")}
                  className="accent-zinc-900 cursor-pointer"
                />
                Invite Only
              </label>
            </div>
          </div>

          <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              style={{ background: "#D9252A", color: "#FFFFFF" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
              className="disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RingLoader size="sm" className="inline-flex" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
