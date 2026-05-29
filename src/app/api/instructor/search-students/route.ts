import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    // Get the course to find the org
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { organizationId: true }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const orgId = course.organizationId;

    // Get all students in the same organization who are NOT already enrolled
    const students = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            organizationId: orgId,
            role: "STUDENT",
          }
        },
        AND: q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ]
        } : {},
        enrollments: {
          none: {
            courseId: courseId,
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
    });

    return NextResponse.json({ students }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[GET /api/instructor/search-students] Error:", error);
    return NextResponse.json({ error: "Failed to search students" }, { status: 500 });
  }
}
