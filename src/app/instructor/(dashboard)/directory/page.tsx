import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserMinus, KeyRound } from "lucide-react";
import { AccessDenied } from "@/components/AccessDenied";
import { getDashboardContext } from "../_lib";

export const dynamic = "force-dynamic";

async function removeMember(formData: FormData) {
  "use server";
  const memberId = formData.get("memberId") as string;
  if (memberId) {
    await prisma.organizationMember.delete({ where: { id: memberId } });
    revalidatePath("/instructor/directory");
  }
}

export default async function InstructorDirectoryPage() {
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

  const allMembers = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.orgId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { role: "asc" },
  });

  const roleColor = (role: string) => {
    if (role === "ADMIN") return "bg-violet-100 text-violet-700";
    if (role === "INSTRUCTOR") return "bg-blue-100 text-blue-700";
    return "bg-emerald-100 text-emerald-700";
  };

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-zinc-500" />
        <h1 className="text-xl font-bold text-zinc-900">Workspace Directory</h1>
        <span className="ml-auto text-xs text-zinc-400">{allMembers.length} members</span>
      </div>

      <Card className="border-violet-200 bg-violet-50 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-violet-900 text-sm font-bold">
            <KeyRound className="w-4 h-4" /> Workspace Invite Code
          </CardTitle>
          <p className="text-xs text-violet-600">Share this with co-instructors and students to join your workspace.</p>
        </CardHeader>
        <CardContent>
          <code className="bg-white px-4 py-2.5 rounded-lg border border-violet-200 font-mono text-lg text-violet-900 block w-full text-center tracking-widest font-bold">
            {ctx.orgId}
          </code>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100">
            {allMembers.map((mem) => (
              <div key={mem.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                <div>
                  <p className="font-medium text-zinc-900 text-sm flex items-center gap-2">
                    {mem.user.name || "Unnamed"}
                    {mem.user.id === ctx.userId && (
                      <span className="text-[9px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">You</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{mem.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${roleColor(mem.role)}`}>
                    {mem.role}
                  </span>
                  {mem.user.id !== ctx.userId && (
                    <form action={removeMember}>
                      <input type="hidden" name="memberId" value={mem.id} />
                      <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <UserMinus className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
