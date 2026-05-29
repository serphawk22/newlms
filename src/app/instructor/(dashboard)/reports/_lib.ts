import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export async function getInstructorOrgContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let payload: { userId?: string };
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as { userId?: string };
  } catch {
    redirect("/login");
  }

  if (!payload.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      memberships: {
        select: {
          organizationId: true,
          role: true,
          organization: { select: { name: true } },
        },
      },
    },
  });

  if (!user || user.memberships.length === 0) redirect("/login");

  const membership = user.memberships[0];
  return {
    userId: user.id,
    userName: user.name || "Instructor",
    orgId: membership.organizationId,
    orgName: membership.organization.name,
    role: membership.role,
  };
}
