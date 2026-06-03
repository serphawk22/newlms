import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");
const roleCookie: Record<string, string> = {
  STUDENT: "student_token",
  INSTRUCTOR: "instructor_token",
  ADMIN: "admin_token",
};

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (token) {
      try {
        const { payload } = await jwtVerify(token, secret);
        const role = payload.role as string | undefined;
        if (role && roleCookie[role]) {
          cookieStore.delete(roleCookie[role]);
        }
      } catch {
        // Token is already invalid/expired; clear the generic cookie below.
      }
    }

    cookieStore.delete("token");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/auth/logout] Error:", err);
    try {
      (await cookies()).delete("token");
    } catch {
      // ignore
    }
    return NextResponse.json({ success: true });
  }
}

/**
 * GET /api/auth/logout?redirect=/admin/login
 *
 * Clears ALL auth cookies and redirects the browser.
 * Used server-side (from _lib.ts) to break redirect loops caused by stale JWT cookies.
 * When the DB session is invalid but the JWT is still cryptographically valid, the
 * middleware would otherwise keep looping between the dashboard and the login page.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect") || "/admin/login";

  // Build a redirect response so we can set cookie-clearing headers on it
  const res = NextResponse.redirect(new URL(redirectTo, req.url));

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0, // expire immediately
  };

  // Clear all possible auth cookies
  res.cookies.set("token", "", cookieOptions);
  res.cookies.set("admin_token", "", cookieOptions);
  res.cookies.set("student_token", "", cookieOptions);
  res.cookies.set("instructor_token", "", cookieOptions);

  return res;
}
