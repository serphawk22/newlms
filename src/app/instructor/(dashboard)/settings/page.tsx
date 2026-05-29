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
    return <div className="text-center py-12 text-zinc-500">Organization not found.</div>;
  }

  return (
    <div className="container-page max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Organization Settings</h1>
      </div>

      <Card className="border-zinc-200 shadow-sm p-6">
        <form action={updateOrgName} className="space-y-6">
          <input type="hidden" name="orgId" value={org.id} />

          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-600 font-semibold text-xs uppercase tracking-wider">
              Organization Name
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={org.name}
              required
              className="border-zinc-200 focus-visible:ring-zinc-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-zinc-600 font-semibold text-xs uppercase tracking-wider">
              Slug
            </Label>
            <Input
              id="slug"
              value={org.slug}
              disabled
              className="border-zinc-200 bg-zinc-50 text-zinc-500"
            />
            <p className="text-[10px] text-zinc-400">Slug cannot be changed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo" className="text-zinc-600 font-semibold text-xs uppercase tracking-wider">
              Organization Logo
            </Label>
            <Input
              id="logo"
              type="file"
              disabled
              className="border-zinc-200 bg-zinc-50 text-zinc-400"
              accept="image/*"
            />
            <p className="text-[10px] text-zinc-400">Logo upload coming soon.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-zinc-600 font-semibold text-xs uppercase tracking-wider">
              Default Timezone
            </Label>
            <select
              id="timezone"
              disabled
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 text-sm"
            >
              <option>UTC (Coordinated Universal Time)</option>
            </select>
            <p className="text-[10px] text-zinc-400">Timezone selection coming soon.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-600 font-semibold text-xs uppercase tracking-wider">
              Registration Mode
            </Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-500">
                <input type="radio" name="regMode" value="open" disabled className="accent-zinc-900" />
                Open Registration
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-500">
                <input type="radio" name="regMode" value="invite" checked disabled className="accent-zinc-900" />
                Invite Only
              </label>
            </div>
            <p className="text-[10px] text-zinc-400">Registration settings coming soon.</p>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
