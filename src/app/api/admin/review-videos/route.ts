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

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing video ID" }, { status: 400 });
    }

    await prisma.adminReviewVideo.delete({
      where: { id }
    });

    return Response.json({ success: true, message: "Video deleted successfully" });
  } catch (error) {
    console.error("Failed to delete admin review video:", error);
    return Response.json({ error: "Failed to delete video" }, { status: 500 });
  }
}
