import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export type DashboardRole = "ADMIN" | "INSTRUCTOR";

export interface DashboardContext {
  userId: string;
  userName: string;
  userEmail: string;
  orgId: string;
  orgName: string;
  role: DashboardRole;
}

export async function getDashboardContext(): Promise<DashboardContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: { userId?: string; role?: string };
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as { userId?: string; role?: string };
  } catch {
    redirect("/login");
  }

  if (!payload.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        select: {
          role: true,
          organizationId: true,
          organization: { select: { name: true } },
        },
      },
    },
  });

  if (!user || user.memberships.length === 0) redirect("/login");

  const membership = user.memberships[0];
  if (membership.role !== "ADMIN" && membership.role !== "INSTRUCTOR") redirect("/login");

  return {
    userId: user.id,
    userName: user.name || "Instructor",
    userEmail: user.email,
    orgId: membership.organizationId,
    orgName: membership.organization.name,
    role: membership.role,
  };
}
