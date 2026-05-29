import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/users] Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
