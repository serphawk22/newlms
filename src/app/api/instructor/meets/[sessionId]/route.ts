import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const session = await prisma.liveSession.findFirst({
      where: { id: sessionId },
      include: { course: { select: { creatorId: true } } },
    });

    if (!session) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (session.course.creatorId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.liveSession.delete({ where: { id: sessionId } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }
}
