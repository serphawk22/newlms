import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    
    await prisma.liveSession.update({ 
      where: { roomId }, 
      data: { status: body.status } 
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating live session by roomId:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
