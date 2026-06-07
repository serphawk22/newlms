import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDashboardContext } from "../_lib";
import { AccessDenied } from "@/components/AccessDenied";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

async function updateOrgName(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  const orgId = (formData.get("orgId") as string)?.trim();
  if (!name || !orgId) return;
  try {
    await prisma.organization.update({
      where: { id: orgId },
      data: { name },
    });
    revalidatePath("/instructor/settings");
  } catch {
    // ignore
  }
}

export default async function SettingsPage() {
  const ctx = await getDashboardContext();

  if (ctx.role !== "ADMIN") {
    return (
      <AccessDenied
        title="Admin Access Required"
        description="This section is only available to administrators"
        buttonLabel="Go back"
        buttonHref="/instructor"
      />
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { id: true, name: true, slug: true },
  });

  if (!org) {
    return <div className="text-center py-12" style={{ color: "var(--muted-foreground)" }}>Organization not found.</div>;
  }

  return (
    <div className="container-page max-w-2xl space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Settings className="w-5 h-5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Organization Settings</h1>
      </div>

      <Card className="p-6" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
        <form action={updateOrgName} className="space-y-6">
          <input type="hidden" name="orgId" value={org.id} />

          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Organization Name
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={org.name}
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
              value={org.slug}
              disabled
              style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            />
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Slug cannot be changed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo" className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Organization Logo
            </Label>
            <Input
              id="logo"
              type="file"
              disabled
              style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              accept="image/*"
            />
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Logo upload coming soon.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Default Timezone
            </Label>
            <select
              id="timezone"
              disabled
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--secondary-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            >
              <option>UTC (Coordinated Universal Time)</option>
            </select>
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Timezone selection coming soon.</p>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Registration Mode
            </Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                <input type="radio" name="regMode" value="open" disabled className="accent-zinc-900" />
                Open Registration
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                <input type="radio" name="regMode" value="invite" checked disabled className="accent-zinc-900" />
                Invite Only
              </label>
            </div>
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Registration settings coming soon.</p>
          </div>

          <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <Button type="submit" style={{ background: "#D9252A", color: "#FFFFFF" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")} onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
