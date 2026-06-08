import { prisma } from "@/lib/prisma";
import { queueEmail } from "@/lib/mail-queue";
import {
  getCourseCreationEmailHtml,
  getAssignmentEmailHtml,
  getQuizEmailHtml,
  getFeedbackEmailHtml,
  getStudentAchievementEmailHtml,
  getStudentCertificateEmailHtml,
  getStudentCourseEventEmailHtml,
  getStudentLiveClassReminderEmailHtml,
  getStudentLoginEmailHtml,
} from "@/lib/mail-templates";

export type StudentEmailPreferenceCategory =
  | "email"
  | "achievement"
  | "course"
  | "reminder";

async function queueStudentEmail({
  userId,
  toEmail,
  subject,
  type,
  html,
  category,
}: {
  userId: string;
  toEmail: string;
  subject: string;
  type: string;
  html: string;
  category: StudentEmailPreferenceCategory;
}) {
  // Preference hooks are intentionally centralized here. When user-level email
  // settings are added, gate the category before queueing without touching callers.
  void category;

  await queueEmail({
    userId,
    toEmail,
    subject,
    type,
    html,
  });
}

export async function triggerStudentLoginEmail({
  userId,
  email,
  name,
  role,
  loginDateTime,
}: {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  loginDateTime: string;
}) {
  if (role !== "STUDENT") return;

  await queueStudentEmail({
    userId,
    toEmail: email,
    subject: "Login Successful",
    type: "STUDENT_LOGIN",
    category: "email",
    html: getStudentLoginEmailHtml(name || email, loginDateTime),
  });
}

export async function triggerEnrollmentAcceptedEmail(enrollmentId: string) {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: true,
        course: { select: { title: true } },
      },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") return;

    await queueStudentEmail({
      userId: enrollment.userId,
      toEmail: enrollment.user.email,
      subject: "Course Enrolled",
      type: "COURSE_ENROLLED",
      category: "course",
      html: getStudentCourseEventEmailHtml({
        title: "Course Enrolled",
        subtitle: "You are ready to start learning",
        intro: "You have been enrolled in a course on Ally Tech LMS.",
        courseName: enrollment.course.title,
        eventLabel: "Course enrolled",
      }),
    });
  } catch (error) {
    console.error("[triggerEnrollmentAcceptedEmail] Error:", error);
  }
}

export async function triggerStudentAssignedToCourseEmail({
  userId,
  courseId,
}: {
  userId: string;
  courseId: string;
}) {
  try {
    const [student, course] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
    ]);

    if (!student || !course) return;

    await queueStudentEmail({
      userId,
      toEmail: student.email,
      subject: "New Course Assigned",
      type: "COURSE_ASSIGNED",
      category: "course",
      html: getStudentCourseEventEmailHtml({
        title: "New Course Assigned",
        subtitle: "A new course has been added for you",
        intro: "A new course has been assigned to your Ally Tech LMS account.",
        courseName: course.title,
        eventLabel: "New course assigned",
      }),
    });
  } catch (error) {
    console.error("[triggerStudentAssignedToCourseEmail] Error:", error);
  }
}

export async function triggerCertificateEarnedEmail({
  userId,
  courseId,
  certificateNumber,
}: {
  userId: string;
  courseId: string;
  certificateNumber?: string;
}) {
  try {
    const [student, course] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
    ]);

    if (!student || !course) return;

    await queueStudentEmail({
      userId,
      toEmail: student.email,
      subject: "Certificate Earned",
      type: "CERTIFICATE_EARNED",
      category: "achievement",
      html: getStudentCertificateEmailHtml(course.title, certificateNumber),
    });
  } catch (error) {
    console.error("[triggerCertificateEarnedEmail] Error:", error);
  }
}

export async function triggerAchievementUnlockedEmail({
  userId,
  achievementName,
  achievementType = "Achievement",
}: {
  userId: string;
  achievementName: string;
  achievementType?: string;
}) {
  try {
    const student = await prisma.user.findUnique({ where: { id: userId } });
    if (!student) return;

    await queueStudentEmail({
      userId,
      toEmail: student.email,
      subject: "New Achievement Unlocked",
      type: "ACHIEVEMENT_UNLOCKED",
      category: "achievement",
      html: getStudentAchievementEmailHtml(achievementName, achievementType),
    });
  } catch (error) {
    console.error("[triggerAchievementUnlockedEmail] Error:", error);
  }
}

export async function triggerLiveClassReminderEmail({
  userId,
  toEmail,
  courseName,
  sessionTitle,
  sessionId,
  roomId,
  scheduledAt,
  reminderLabel,
  reminderType,
}: {
  userId: string;
  toEmail: string;
  courseName: string;
  sessionTitle: string;
  sessionId: string;
  roomId: string;
  scheduledAt: Date;
  reminderLabel: string;
  reminderType: "24H" | "1H" | "15M";
}) {
  const type = `LIVE_CLASS_REMINDER_${reminderType}_${sessionId}`;
  const existing = await prisma.emailNotification.findFirst({
    where: { userId, type },
    select: { id: true },
  });
  if (existing) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  await queueStudentEmail({
    userId,
    toEmail,
    subject: `Live Class Starts ${reminderLabel}`,
    type,
    category: "reminder",
    html: getStudentLiveClassReminderEmailHtml({
      courseName,
      sessionTitle,
      scheduledAt,
      reminderLabel,
      joinLink: `${appUrl}/meet/${roomId}`,
    }),
  });
}

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

      const isStudent = member.role === "STUDENT";
      await queueEmail({
        userId: member.userId,
        toEmail: member.user.email,
        subject: isStudent ? "New Course Assigned" : "New Course Created",
        type: "COURSE_CREATE",
        html: isStudent
          ? getStudentCourseEventEmailHtml({
              title: "New Course Assigned",
              subtitle: "A new course is available for you",
              intro: "A course has been added to your Ally Tech LMS learning catalog.",
              courseName: course.title,
              eventLabel: "New course assigned",
            })
          : getCourseCreationEmailHtml(
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
        subject: "New Assignment Added",
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
        subject: "New Quiz Added",
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

    const eventCopy: Record<typeof updateType, { subject: string; title: string; label: string; intro: string }> = {
      LESSON: {
        subject: "New Module Released",
        title: "New Module Released",
        label: "New module released",
        intro: "New learning content has been released in your course.",
      },
      MODULE: {
        subject: "New Module Released",
        title: "New Module Released",
        label: "New module released",
        intro: "A new module is available in your course.",
      },
      READING_MATERIAL: {
        subject: "New Reading Material Added",
        title: "New Reading Material Added",
        label: "New reading material added",
        intro: "New reading material has been added to your course.",
      },
      VIDEO: {
        subject: "Course Content Updated",
        title: "Course Content Updated",
        label: "New learning content added",
        intro: "New learning content has been added to your course.",
      },
    };
    const copy = eventCopy[updateType];
    const emailHtml = getStudentCourseEventEmailHtml({
      title: copy.title,
      subtitle: "New resources are available for your study",
      intro: copy.intro,
      courseName: course.title,
      contentTitle,
      eventLabel: copy.label,
    });

    for (const env of enrollments) {
      await queueEmail({
        userId: env.userId,
        toEmail: env.user.email,
        subject: copy.subject,
        type: "COURSE_UPDATE",
        html: emailHtml,
      });
    }
  } catch (error) {
    console.error("[triggerCourseUpdateNotifications] Error:", error);
  }
}
