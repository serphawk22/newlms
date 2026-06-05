import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role") || "STUDENT";
    const role = roleParam.toUpperCase();
    const intentParam = searchParams.get("intent") || "login";
    const intent = intentParam.toLowerCase();

    if (!["STUDENT", "INSTRUCTOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const jwtSecret = process.env.JWT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Google OAuth credentials not configured" }, { status: 500 });
    }

    if (!jwtSecret) {
      return NextResponse.json({ error: "JWT_SECRET not configured" }, { status: 500 });
    }

    console.log({
      appUrl,
      redirectUri: `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`,
    });
    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;

    // Sign a JWT as the state parameter — eliminates cookie dependency across origin redirects
    const secret = new TextEncoder().encode(jwtSecret);
    const state = await new SignJWT({ role, intent })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("prompt", "select_account");

    const response = NextResponse.redirect(googleAuthUrl.toString());

    return response;
  } catch (error) {
    console.error("[GET /api/auth/google] Error:", error);
    return NextResponse.json({ error: "Failed to initiate Google authentication" }, { status: 500 });
  }
}