import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.userId as string;
    const { type, url } = await req.json();

    if (!type || !url) {
      return NextResponse.json({ error: "type and url are required" }, { status: 400 });
    }

    if (type === "avatar") {
      await prisma.user.update({ where: { id: userId }, data: { avatar: url } });
    } else if (type === "cover") {
      await prisma.user.update({ where: { id: userId }, data: { coverImage: url } });
    } else {
      return NextResponse.json({ error: "Invalid type. Must be 'avatar' or 'cover'" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/student/profile/upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
