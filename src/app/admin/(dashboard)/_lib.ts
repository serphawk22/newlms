import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

// Redirect path that clears stale cookies before sending to login.
// This breaks ERR_TOO_MANY_REDIRECTS: the middleware keeps re-admitting users
// who have an old-but-still-cryptographically-valid JWT cookie, bouncing them
// between /admin and /admin/login endlessly. By routing through the logout
// endpoint first we force-expire all auth cookies so the middleware lets the
// login page render normally.
const CLEAR_AND_REDIRECT = "/api/auth/logout?redirect=/admin/login";

export interface AdminContext {
  userId: string;
  userName: string;
  userEmail: string;
  orgId: string;
  orgName: string;
}

export async function getAdminContext(): Promise<AdminContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/admin/login");

  let payload: { userId?: string; role?: string };
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as { userId?: string; role?: string };
  } catch {
    // JWT is expired / malformed → clear cookies so the middleware stops looping
    redirect(CLEAR_AND_REDIRECT);
  }

  if (!payload.userId) redirect(CLEAR_AND_REDIRECT);

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

  // User not found in DB (e.g. after a reseed) or not an admin →
  // clear the stale cookies to prevent the middleware redirect loop
  if (!user || user.memberships.length === 0) redirect(CLEAR_AND_REDIRECT);

  const membership = user.memberships[0];
  if (membership.role !== "ADMIN") redirect(CLEAR_AND_REDIRECT);

  return {
    userId: user.id,
    userName: user.name || "Admin",
    userEmail: user.email,
    orgId: membership.organizationId,
    orgName: membership.organization.name,
  };
}

