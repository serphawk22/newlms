import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { generateUniqueLoginCode } from "@/lib/loginCode";
import { generateSessionJwt, ROLE_COOKIE, ROLE_REDIRECT } from "@/lib/auth";
import type { Role } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const oauthError = searchParams.get("error");

  // Determine role from signed JWT state
  let role: Role = "STUDENT";
  let intent = "login";

  if (stateParam) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new Error("JWT_SECRET not configured");
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(stateParam, secret);
      if (payload.role && typeof payload.role === "string") role = payload.role.toUpperCase() as Role;
      if (payload.intent) intent = (payload.intent as string).toLowerCase();
    } catch (e) {
      console.error("[Callback] Error verifying state JWT:", e);
    }
  }

  console.log(`[Google Auth Callback] role=${role}, intent=${intent}`);

  const getLoginUrl = (errMessage: string) => {
    const base = role === "STUDENT" ? "/student/login" : role === "INSTRUCTOR" ? "/instructor/login" : "/admin/login";
    return `${base}?error=${encodeURIComponent(errMessage)}`;
  };

  // 1. Handle OAuth Error/Cancellation
  if (oauthError) {
    console.error("[Callback] Google OAuth error:", oauthError);
    return NextResponse.redirect(new URL(getLoginUrl("Google authentication was cancelled"), request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL(getLoginUrl("Google auth failed: missing code"), request.url));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL(getLoginUrl("Google OAuth credentials not configured on server"), request.url));
    }

    console.log({
      appUrl,
      redirectUri: `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`,
    });
    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;

    // 2. Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[Callback] Token exchange failed:", errorData);
      return NextResponse.redirect(new URL(getLoginUrl("Failed to retrieve access token from Google"), request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL(getLoginUrl("Access token missing from Google response"), request.url));
    }

    // 3. Retrieve user info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      console.error("[Callback] Fetching user info failed:", await userInfoResponse.text());
      return NextResponse.redirect(new URL(getLoginUrl("Failed to retrieve user profile from Google"), request.url));
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.email;
    const emailVerified = userInfo.email_verified;
    const name = userInfo.name;

    if (!email) {
      return NextResponse.redirect(new URL(getLoginUrl("Google account does not provide an email address"), request.url));
    }

    if (emailVerified !== true && emailVerified !== "true") {
      return NextResponse.redirect(new URL(getLoginUrl("Google email address is not verified"), request.url));
    }

    // 4. Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (user) {
      // Auto-activate PENDING students on Google OAuth login
      if (user.status === "PENDING" && role === "STUDENT") {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: "ACTIVE" },
        });
        user.status = "ACTIVE";
      }

      // Check account status — blocked for non-students
      if (user.status === "PENDING") {
        return NextResponse.redirect(
          new URL(getLoginUrl("Your account is awaiting administrator approval."), request.url)
        );
      }
      if (user.status === "REJECTED") {
        return NextResponse.redirect(
          new URL(getLoginUrl("Your account has been rejected by an administrator."), request.url)
        );
      }

      // User exists — check membership status
      let primaryMembership = user.memberships.find((m) => m.role === role);

      if (!primaryMembership) {
        if (user.memberships.length === 0) {
          if (role === "STUDENT") {
            const org = await prisma.organization.findFirst();
            if (!org) {
              return NextResponse.redirect(
                new URL(getLoginUrl("No organization configured"), request.url)
              );
            }
            primaryMembership = await prisma.organizationMember.create({
              data: { userId: user.id, organizationId: org.id, role: "STUDENT" },
            });
          } else {
            return NextResponse.redirect(
              new URL(getLoginUrl("Your account is awaiting administrator approval."), request.url)
            );
          }
        } else {
          return NextResponse.redirect(
            new URL(getLoginUrl(`This account is not authorized for ${role.toLowerCase()} access`), request.url)
          );
        }
      }

      // Membership exists — issue session and log in
      const { token } = await generateSessionJwt(user, primaryMembership);

      console.log("[Callback] JWT generated, length:", token.length);

      // Set cookies using cookies() API — same mechanism as email/password login (issueAuthSession)
      const cookieStore = await cookies();
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: 60 * 60 * 24,
        path: "/" as const,
      };

      cookieStore.set(ROLE_COOKIE[primaryMembership.role], token, cookieOptions);
      cookieStore.set("token", token, cookieOptions);

      console.log("[Callback] Cookies set via cookies() for", ROLE_COOKIE[primaryMembership.role], "and token");

      // Return 200 HTML with JS redirect — 302 redirects may drop cookies set via cookies()
      const redirectPath = ROLE_REDIRECT[primaryMembership.role];
      console.log("[Callback] JS redirect to:", redirectPath);

      const html = `<!DOCTYPE html><html><body><script>window.location.href='${redirectPath}'</script></body></html>`;
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    // 5. New user signup
    if (intent === "login") {
      const notFoundMessage = role === "ADMIN"
        ? "Admin account not found."
        : "Account not found. Please sign up first.";
      return NextResponse.redirect(
        new URL(getLoginUrl(notFoundMessage), request.url)
      );
    }

    // Use a configured default organization
    const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;
    let targetOrg = null;

    if (defaultOrgId) {
      targetOrg = await prisma.organization.findUnique({ where: { id: defaultOrgId } });
    } else {
      const orgCount = await prisma.organization.count();
      if (orgCount === 1) {
        targetOrg = await prisma.organization.findFirst();
      }
    }

    if (!targetOrg) {
      return NextResponse.redirect(
        new URL(getLoginUrl("No default organization configured. Cannot create account."), request.url)
      );
    }

    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const loginCode = await generateUniqueLoginCode(role, prisma);

    if (role === "STUDENT" || role === "ADMIN") {
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split("@")[0],
          loginCode,
          status: "ACTIVE",
          memberships: {
            create: {
              organizationId: targetOrg.id,
              role,
            },
          },
        },
      });

      const membership = await prisma.organizationMember.findFirst({
        where: { userId: newUser.id, organizationId: targetOrg.id },
      });

      if (!membership) {
        return NextResponse.redirect(
          new URL(getLoginUrl("Failed to set up account membership"), request.url)
        );
      }

      const { token } = await generateSessionJwt(newUser, membership);

      const cookieStore = await cookies();
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: 60 * 60 * 24,
        path: "/" as const,
      };

      cookieStore.set(ROLE_COOKIE[membership.role], token, cookieOptions);
      cookieStore.set("token", token, cookieOptions);

      const redirectPath = ROLE_REDIRECT[membership.role];

      const html = `<!DOCTYPE html><html><body><script>window.location.href='${redirectPath}'</script></body></html>`;
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
        loginCode,
      },
    });

    const signupUrl = `/${role.toLowerCase()}/signup?message=${encodeURIComponent("Registration submitted. Awaiting administrator approval.")}`;
    return NextResponse.redirect(new URL(signupUrl, request.url));
  } catch (error) {
    console.error("[Callback] Error:", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.redirect(new URL(getLoginUrl(message), request.url));
  }
}