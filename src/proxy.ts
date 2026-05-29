import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

type AuthPayload = {
  userId?: string;
  role?: string;
  sessionToken?: string;
  [key: string]: unknown;
};

const ROLE_COOKIE: Record<Role, string> = {
  STUDENT: "student_token",
  INSTRUCTOR: "instructor_token",
  ADMIN: "admin_token",
};

const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  INSTRUCTOR: "/instructor",
  ADMIN: "/admin",
};

const ROLE_LOGIN: Record<Role, string> = {
  STUDENT: "/student/login",
  INSTRUCTOR: "/instructor/login",
  ADMIN: "/admin/login",
};

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

function isAuthPage(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/student/login" ||
    pathname === "/student/signup" ||
    pathname === "/instructor/login" ||
    pathname === "/instructor/signup" ||
    pathname === "/admin/login" ||
    pathname === "/admin/signup"
  );
}

function getLoginForPath(pathname: string) {
  if (pathname.startsWith("/student")) return ROLE_LOGIN.STUDENT;
  if (pathname.startsWith("/instructor")) return ROLE_LOGIN.INSTRUCTOR;
  if (pathname.startsWith("/admin")) return ROLE_LOGIN.ADMIN;
  return "/login";
}

function getAllowedRoles(pathname: string): Role[] | null {
  if (pathname.startsWith("/api/auth/")) return null;

  if (pathname.startsWith("/api/student/")) return ["STUDENT"];
  if (pathname.startsWith("/api/instructor/")) return ["INSTRUCTOR"];
  if (pathname.startsWith("/api/admin/")) return ["ADMIN"];

  if (pathname.startsWith("/student/courses/")) return ["STUDENT", "INSTRUCTOR", "ADMIN"];
  if (pathname.startsWith("/student")) return ["STUDENT"];
  if (pathname.startsWith("/instructor")) return ["INSTRUCTOR"];
  if (pathname.startsWith("/admin")) return ["ADMIN"];
  if (pathname.startsWith("/meet")) return ["STUDENT", "INSTRUCTOR", "ADMIN"];

  return null;
}

async function verifyToken(token: string | undefined): Promise<AuthPayload | null> {
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getSecret());
    return verified.payload as AuthPayload;
  } catch {
    return null;
  }
}

async function findAuthForRoles(req: NextRequest, allowedRoles: Role[]) {
  for (const role of allowedRoles) {
    const roleCookieName = ROLE_COOKIE[role];
    const roleToken = req.cookies.get(roleCookieName)?.value;
    const rolePayload = await verifyToken(roleToken);

    if (rolePayload?.role === role) {
      return { token: roleToken!, payload: rolePayload, role };
    }
  }

  const legacyToken = req.cookies.get("token")?.value;
  const legacyPayload = await verifyToken(legacyToken);
  const legacyRole = legacyPayload?.role as Role | undefined;

  if (legacyToken && legacyPayload && legacyRole && allowedRoles.includes(legacyRole)) {
    return { token: legacyToken, payload: legacyPayload, role: legacyRole };
  }

  return null;
}

function nextWithToken(req: NextRequest, token: string) {
  const requestHeaders = new Headers(req.headers);
  const cookieHeader = req.headers.get("cookie") ?? "";
  const normalizedCookieHeader = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith("token="))
    .concat(`token=${token}`)
    .join("; ");

  requestHeaders.set("cookie", normalizedCookieHeader);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return res;
}

function redirectToLogin(req: NextRequest, pathname: string, reason: string) {
  const loginUrl = new URL(getLoginForPath(pathname), req.url);
  loginUrl.searchParams.set("error", reason);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log("PROXY START:", pathname);

  if (req.headers.get("Next-Action") !== null) {
    return NextResponse.next();
  }

  if (isAuthPage(pathname)) {
    const allowedForLoginPage = pathname.startsWith("/student")
      ? ["STUDENT"]
      : pathname.startsWith("/instructor")
        ? ["INSTRUCTOR"]
        : pathname.startsWith("/admin")
          ? ["ADMIN"]
          : (["STUDENT", "INSTRUCTOR", "ADMIN"] as Role[]);

    const existingAuth = await findAuthForRoles(req, allowedForLoginPage as Role[]);
    if (existingAuth) {
      return NextResponse.redirect(new URL(ROLE_HOME[existingAuth.role], req.url));
    }

    return NextResponse.next();
  }

  if (pathname === "/" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const allowedRoles = getAllowedRoles(pathname);
  if (!allowedRoles) {
    return NextResponse.next();
  }

  const auth = await findAuthForRoles(req, allowedRoles);

  if (!auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return redirectToLogin(req, pathname, "session_required");
  }

  if (pathname.startsWith("/api/")) {
    return nextWithToken(req, auth.token);
  }

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (process.env.NODE_ENV === "development") {
    return nextWithToken(req, auth.token);
  }

  try {
    const verifyRes = await fetch(`${appOrigin}/api/auth/verify-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
    });

    if (!verifyRes.ok) {
      return redirectToLogin(req, pathname, "session_expired");
    }
  } catch {
    return nextWithToken(req, auth.token);
  }

  return nextWithToken(req, auth.token);
}

export const config = {
  matcher: [
    "/login",
    "/student",
    "/student/login",
    "/student/signup",
    "/instructor",
    "/instructor/login",
    "/instructor/signup",
    "/admin",
    "/admin/login",
    "/admin/signup",
    "/meet/:path*",
    "/student/((?!login|signup).*)",
    "/instructor/((?!login|signup).*)",
    "/admin/((?!login|signup).*)",
    "/api/student/:path*",
    "/api/instructor/:path*",
    "/api/admin/:path*",
  ],
};
