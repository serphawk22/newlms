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

  const getRoleStyle = (role: string) => {
    if (role === "ADMIN") {
      return {
        background: "rgba(217,37,42,0.12)",
        color: "#D9252A",
        borderColor: "rgba(217,37,42,0.25)",
      };
    }
    if (role === "INSTRUCTOR") {
      return {
        background: "rgba(255,255,255,0.06)",
        color: "var(--foreground)",
        borderColor: "var(--border)",
      };
    }
    return {
      background: "rgba(255,255,255,0.04)",
      color: "var(--muted-foreground)",
      borderColor: "var(--border)",
    };
  };

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="w-5 h-5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Workspace Directory</h1>
        <span className="ml-auto text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>{allMembers.length} members</span>
      </div>

      <Card
        style={{
          background: "rgba(217,37,42,0.12)",
          borderColor: "rgba(217,37,42,0.25)",
          boxShadow: "none",
        }}
        className="border"
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold" style={{ color: "#D9252A" }}>
            <KeyRound className="w-4 h-4" /> Workspace Invite Code
          </CardTitle>
          <p className="text-xs" style={{ color: "var(--foreground)" }}>Share this with co-instructors and students to join your workspace.</p>
        </CardHeader>
        <CardContent>
          <code
            style={{
              background: "var(--card)",
              borderColor: "rgba(217,37,42,0.25)",
              color: "#D9252A",
            }}
            className="px-4 py-2.5 rounded-lg border font-mono text-lg block w-full text-center tracking-widest font-bold"
          >
            {ctx.orgId}
          </code>
        </CardContent>
      </Card>

      <Card
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}
        className="overflow-hidden"
      >
        <CardContent className="p-0">
          <div className="divide-y animate-fade-in" style={{ borderColor: "var(--border)" }}>
            {allMembers.map((mem) => (
              <div
                key={mem.id}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[rgba(217,37,42,0.04)]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                    {mem.user.name || "Unnamed"}
                    {mem.user.id === ctx.userId && (
                      <span
                        className="text-[9px] px-2 py-0.5 rounded-full font-bold border"
                        style={{
                          background: "rgba(217,37,42,0.12)",
                          color: "#D9252A",
                          borderColor: "rgba(217,37,42,0.25)",
                        }}
                      >
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{mem.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider"
                    style={getRoleStyle(mem.role)}
                  >
                    {mem.role}
                  </span>
                  {mem.user.id !== ctx.userId && (
                    <form action={removeMember}>
                      <input type="hidden" name="memberId" value={mem.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 transition-colors hover:bg-[rgba(217,37,42,0.08)]"
                        style={{ color: "#D9252A" }}
                      >
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
