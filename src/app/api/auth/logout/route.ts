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
