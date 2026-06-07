import { prisma } from "@/lib/prisma";
import { queueEmail } from "@/lib/mail-queue";
import {
  getCourseCreationEmailHtml,
  getAssignmentEmailHtml,
  getQuizEmailHtml,
  getFeedbackEmailHtml,
  getCourseUpdateEmailHtml,
} from "@/lib/mail-templates";

export async function triggerCourseCreatedNotifications(courseId: string) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        creator: true,
      },
    });

    if (!course) return;

    const orgId = course.organizationId;
    const instructorName = course.creator.name || course.creator.email;
    const creationDate = course.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
    const status = course.published ? "Active" : "Draft";

    // 1. Send confirmation to the Instructor
    await queueEmail({
      userId: course.creatorId,
      toEmail: course.creator.email,
      subject: "New Course Created",
      type: "COURSE_CREATE",
      html: getCourseCreationEmailHtml(
        course.title,
        instructorName,
        creationDate,
        status,
        "INSTRUCTOR"
      ),
    });

    // 2. Fetch all Admins and Students in the organization
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: orgId,
        role: { in: ["ADMIN", "STUDENT"] },
      },
      include: {
        user: true,
      },
    });

    for (const member of members) {
      // Avoid sending duplicate to instructor if they are also registered differently, but role check handles it
      if (member.userId === course.creatorId) continue;

      await queueEmail({
        userId: member.userId,
        toEmail: member.user.email,
        subject: "New Course Created",
        type: "COURSE_CREATE",
        html: getCourseCreationEmailHtml(
          course.title,
          instructorName,
          creationDate,
          status,
          member.role
        ),
      });
    }
  } catch (error) {
    console.error("[triggerCourseCreatedNotifications] Error:", error);
  }
}

export async function triggerAssignmentCreatedNotifications(assignmentId: string) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          include: {
            creator: true,
          },
        },
      },
    });

    if (!assignment) return;

    const course = assignment.course;
    const instructorName = course.creator.name || course.creator.email;
    const dueDate = assignment.updatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"; // Or custom formatting if due date is stored, but schema doesn't have dueDate. Wait, does schema have dueDate? Let's check prisma schema.

    // Let's check prisma schema: Assignment model has: id, title, description, driveLink, courseId, createdAt, updatedAt.
    // It doesn't have a specific dueDate field. So we can use updatedAt or a generic message. Let's look at the instruction:
    // "Email should contain: Assignment Title, Course Name, Due Date, Instructor Name"
    // Since there's no dueDate field on Assignment in the schema, we can default to "Refer to dashboard" or format updatedAt + 7 days as default due date, or check if they pass a due date. Let's format it as "Please refer to the LMS platform dashboard for the exact due date." or a default date. Let's use "Refer to platform".
    const displayDueDate = "Refer to LMS Platform";

    // 1. Fetch all students enrolled in the course
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: course.id,
        status: "ACTIVE",
      },
      include: {
        user: true,
      },
    });

    // 2. Fetch Admins in the organization
    const admins = await prisma.organizationMember.findMany({
      where: {
        organizationId: course.organizationId,
        role: "ADMIN",
      },
      include: {
        user: true,
      },
    });

    const emailHtml = getAssignmentEmailHtml(
      assignment.title,
      course.title,
      displayDueDate,
      instructorName
    );

    // Queue for enrolled students
    for (const env of enrollments) {
      await queueEmail({
        userId: env.userId,
        toEmail: env.user.email,
        subject: "New Assignment Created",
        type: "ASSIGNMENT",
        html: emailHtml,
      });
    }

    // Queue for admins
    for (const admin of admins) {
      await queueEmail({
        userId: admin.userId,
        toEmail: admin.user.email,
        subject: "New Assignment Created",
        type: "ASSIGNMENT",
        html: emailHtml,
      });
    }
  } catch (error) {
    console.error("[triggerAssignmentCreatedNotifications] Error:", error);
  }
}

export async function triggerQuizCreatedNotifications(quizId: string) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        _count: {
          select: { questions: true },
        },
        course: {
          include: {
            creator: true,
          },
        },
      },
    });

    if (!quiz) return;

    const course = quiz.course;
    const instructorName = course.creator.name || course.creator.email;

    // 1. Fetch all students enrolled in the course
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: course.id,
        status: "ACTIVE",
      },
      include: {
        user: true,
      },
    });

    // 2. Fetch Admins
    const admins = await prisma.organizationMember.findMany({
      where: {
        organizationId: course.organizationId,
        role: "ADMIN",
      },
      include: {
        user: true,
      },
    });

    const emailHtml = getQuizEmailHtml(
      quiz.title,
      course.title,
      quiz._count.questions,
      instructorName
    );

    for (const env of enrollments) {
      await queueEmail({
        userId: env.userId,
        toEmail: env.user.email,
        subject: "New Quiz Created",
        type: "QUIZ",
        html: emailHtml,
      });
    }

    for (const admin of admins) {
      await queueEmail({
        userId: admin.userId,
        toEmail: admin.user.email,
        subject: "New Quiz Created",
        type: "QUIZ",
        html: emailHtml,
      });
    }
  } catch (error) {
    console.error("[triggerQuizCreatedNotifications] Error:", error);
  }
}

export async function triggerFeedbackNotifications(submissionId: string, isQuiz: boolean) {
  try {
    if (!isQuiz) {
      const submission = await prisma.assignmentSubmission.findUnique({
        where: { id: submissionId },
        include: {
          student: true,
          assignment: {
            include: {
              course: {
                include: {
                  creator: true,
                },
              },
            },
          },
        },
      });

      if (!submission || submission.grade === null) return;

      const instructorName = submission.assignment.course.creator.name || submission.assignment.course.creator.email;
      const html = getFeedbackEmailHtml(
        submission.assignment.title,
        submission.grade,
        submission.maxGrade,
        submission.feedback || "",
        instructorName
      );

      await queueEmail({
        userId: submission.studentId,
        toEmail: submission.student.email,
        subject: "Feedback & Grades Published",
        type: "FEEDBACK",
        html,
      });
    } else {
      const submission = await prisma.quizSubmission.findUnique({
        where: { id: submissionId },
        include: {
          student: true,
          quiz: {
            include: {
              course: {
                include: {
                  creator: true,
                },
              },
            },
          },
        },
      });

      if (!submission) return;

      const instructorName = submission.quiz.course.creator.name || submission.quiz.course.creator.email;
      const html = getFeedbackEmailHtml(
        submission.quiz.title,
        submission.obtainedMarks,
        submission.totalMarks,
        "Completed Quiz Assessment",
        instructorName
      );

      await queueEmail({
        userId: submission.studentId,
        toEmail: submission.student.email,
        subject: "Feedback & Grades Published",
        type: "FEEDBACK",
        html,
      });
    }
  } catch (error) {
    console.error("[triggerFeedbackNotifications] Error:", error);
  }
}

export async function triggerCourseUpdateNotifications(
  courseId: string,
  updateType: "LESSON" | "MODULE" | "READING_MATERIAL" | "VIDEO",
  contentTitle: string
) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) return;

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        status: "ACTIVE",
      },
      include: {
        user: true,
      },
    });

    const emailHtml = getCourseUpdateEmailHtml(
      course.title,
      updateType.replace("_", " "),
      contentTitle
    );

    for (const env of enrollments) {
      await queueEmail({
        userId: env.userId,
        toEmail: env.user.email,
        subject: "Course Content Updated",
        type: "COURSE_UPDATE",
        html: emailHtml,
      });
    }
  } catch (error) {
    console.error("[triggerCourseUpdateNotifications] Error:", error);
  }
}
