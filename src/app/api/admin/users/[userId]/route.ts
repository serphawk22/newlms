import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    // Ensure the target user exists and is not an admin
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          select: { role: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting other admins
    if (targetUser.memberships.some(m => m.role === "ADMIN")) {
      return NextResponse.json({ error: "Cannot delete admin users" }, { status: 403 });
    }

    // Delete the user (cascades to enrollments, memberships, etc.)
    await prisma.user.delete({ where: { id: userId } });
    revalidateTag("admin-analytics", "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/users] Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const { status } = await req.json();

    if (!status || !["PENDING", "ACTIVE", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          select: { role: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.memberships.some(m => m.role === "ADMIN")) {
      return NextResponse.json({ error: "Cannot modify admin status" }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });
    revalidateTag("admin-analytics", "max");

    return NextResponse.json({ success: true, user: { id: updatedUser.id, status: updatedUser.status } });
  } catch (error) {
    console.error("[PATCH /api/admin/users] Error:", error);
    return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
  }
}
