import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { triggerCourseCreatedNotifications } from "@/lib/email-notifications-helper";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const role = payload.role as string;

    const body = await req.json();
    const { title, orgId, joinQuestions } = body;

    if (!title || !orgId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prepare data
    const data: any = {
      title,
      organizationId: orgId,
      creatorId: userId,
      published: true,
    };

    // Screening questions only allowed for INSTRUCTOR
    if (role === "INSTRUCTOR" && Array.isArray(joinQuestions)) {
      data.joinQuestions = joinQuestions;
    }

    const course = await prisma.course.create({ data });

    // Trigger course creation email notifications in background
    triggerCourseCreatedNotifications(course.id).catch((err) =>
      console.error("[createCourse notification error]", err)
    );

    return Response.json({ courseId: course.id });
  } catch (error) {
    console.error("Create course error:", error);
    return Response.json({ error: "Failed to create course" }, { status: 500 });
  }
}
