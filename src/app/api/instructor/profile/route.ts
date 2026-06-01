import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { organization: true } } },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio || "",
      expertise: user.expertise || [],
      avatar: user.avatar || "",
      coverImage: user.coverImage || "",
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[GET /api/instructor/profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const body = await req.json();
    const { name, bio, expertise, avatar, coverImage } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(bio !== undefined && { bio: bio.trim() }),
        ...(expertise !== undefined && { expertise }),
        ...(avatar !== undefined && { avatar }),
        ...(coverImage !== undefined && { coverImage }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      bio: updated.bio || "",
      expertise: updated.expertise || [],
      avatar: updated.avatar || "",
      coverImage: updated.coverImage || "",
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("[PUT /api/instructor/profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
