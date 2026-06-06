import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedVideo = await prisma.adminReviewVideo.update({
      where: { id },
      data: { status }
    });

    return Response.json(updatedVideo);
  } catch (error) {
    console.error("Failed to update video status:", error);
    return Response.json({ error: "Failed to update video status" }, { status: 500 });
  }
}
