import { prisma } from "@/lib/prisma";

type NotifPayload = {
  userId: string;
  message: string;
  type: string;
  link?: string;
};

export async function createNotification({
  userId,
  message,
  type,
  link,
}: NotifPayload): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, message, type, link },
    });
  } catch (err) {
    console.error(`[notifications] Failed to create ${type} notif for user ${userId}:`, err);
  }
}

export async function notifyEnrolledStudents({
  courseId,
  message,
  type,
  link,
}: {
  courseId: string;
  message: string;
  type: string;
  link?: string;
}): Promise<void> {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: "ACTIVE" },
      select: { userId: true },
    });

    if (enrollments.length === 0) return;

    await prisma.notification.createMany({
      data: enrollments.map((e) => ({
        userId: e.userId,
        message,
        type,
        link,
      })),
    });
  } catch (err) {
    console.error(`[notifications] Failed to notify enrolled students for course ${courseId}:`, err);
  }
}

export async function notifyCourseCreator({
  courseId,
  message,
  type,
  link,
}: {
  courseId: string;
  message: string;
  type: string;
  link?: string;
}): Promise<void> {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true },
    });
    if (!course) return;

    await createNotification({
      userId: course.creatorId,
      message,
      type,
      link,
    });
  } catch (err) {
    console.error(`[notifications] Failed to notify course creator for course ${courseId}:`, err);
  }
}

export async function notifyOrganizationAdmins({
  organizationId,
  message,
  type,
  link,
}: {
  organizationId: string;
  message: string;
  type: string;
  link?: string;
}): Promise<void> {
  try {
    const admins = await prisma.organizationMember.findMany({
      where: { organizationId, role: "ADMIN" },
      select: { userId: true },
    });

    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.userId,
        message,
        type,
        link,
      })),
    });
  } catch (err) {
    console.error(`[notifications] Failed to notify org admins for org ${organizationId}:`, err);
  }
}

export async function notifyUserRegistration({
  userId,
  name,
  role,
  organizationId,
}: {
  userId: string;
  name: string | null;
  role: string;
  organizationId: string;
}): Promise<void> {
  const message = `New ${role.toLowerCase()} registered: ${name || "Unnamed"}`;
  await notifyOrganizationAdmins({
    organizationId,
    message,
    type: "ADMIN",
    link: "/admin/users",
  });
}

export async function notifyLogin({ userId, name }: { userId: string; name: string | null }) {
  await createNotification({
    userId,
    message: `Welcome back${name ? `, ${name}` : ""}! You logged in successfully.`,
    type: "LOGIN",
  });
}

export async function notifyEnrollmentRequest({
  courseId,
  courseTitle,
  studentName,
  creatorId,
}: {
  courseId: string;
  courseTitle: string;
  studentName: string | null;
  creatorId: string;
}) {
  await createNotification({
    userId: creatorId,
    message: `${studentName || "A student"} requested to join ${courseTitle}.`,
    type: "ENROLLMENT_REQUEST",
    link: `/instructor/courses/${courseId}?tab=students`,
  });
}

export async function notifyEnrollmentAccepted({
  userId,
  courseId,
  courseTitle,
}: {
  userId: string;
  courseId: string;
  courseTitle: string;
}) {
  await createNotification({
    userId,
    message: `You are now enrolled in ${courseTitle}!`,
    type: "ENROLLMENT",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyAssignmentCreated({
  courseId,
  courseTitle,
  assignmentTitle,
}: {
  courseId: string;
  courseTitle: string;
  assignmentTitle: string;
}) {
  await notifyEnrolledStudents({
    courseId,
    message: `New assignment posted in ${courseTitle}: ${assignmentTitle}`,
    type: "ASSIGNMENT",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyAssignmentGraded({
  userId,
  courseId,
  courseTitle,
  assignmentTitle,
  grade,
  maxGrade,
}: {
  userId: string;
  courseId: string;
  courseTitle: string;
  assignmentTitle: string;
  grade: number;
  maxGrade: number;
}) {
  await createNotification({
    userId,
    message: `Your assignment "${assignmentTitle}" in ${courseTitle} has been graded: ${grade}/${maxGrade}.`,
    type: "ASSIGNMENT_GRADED",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyQuizCreated({
  courseId,
  courseTitle,
  quizTitle,
}: {
  courseId: string;
  courseTitle: string;
  quizTitle: string;
}) {
  await notifyEnrolledStudents({
    courseId,
    message: `New quiz posted in ${courseTitle}: ${quizTitle}`,
    type: "QUIZ",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyQuizResult({
  userId,
  courseId,
  courseTitle,
  quizTitle,
  obtainedMarks,
  totalMarks,
}: {
  userId: string;
  courseId: string;
  courseTitle: string;
  quizTitle: string;
  obtainedMarks: number;
  totalMarks: number;
}) {
  await createNotification({
    userId,
    message: `Quiz results are available for "${quizTitle}" in ${courseTitle}: ${obtainedMarks}/${totalMarks}.`,
    type: "QUIZ_RESULT",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyModuleCreated({
  courseId,
  courseTitle,
  moduleTitle,
}: {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
}) {
  await notifyEnrolledStudents({
    courseId,
    message: `New module added to ${courseTitle}: ${moduleTitle}`,
    type: "MODULE",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyReadingMaterialUploaded({
  courseId,
  courseTitle,
  materialTitle,
}: {
  courseId: string;
  courseTitle: string;
  materialTitle: string;
}) {
  await notifyEnrolledStudents({
    courseId,
    message: `New reading material uploaded in ${courseTitle}: ${materialTitle}`,
    type: "MATERIAL",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyCoursePublished({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  await notifyEnrolledStudents({
    courseId,
    message: `${courseTitle} has been published!`,
    type: "COURSE",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyCourseCreated({
  courseId,
  courseTitle,
  organizationId,
  creatorId,
}: {
  courseId: string;
  courseTitle: string;
  organizationId: string;
  creatorId: string;
}) {
  await notifyOrganizationAdmins({
    organizationId,
    message: `A new course "${courseTitle}" has been created.`,
    type: "ADMIN",
    link: `/admin/courses`,
  });
}

export async function notifyLiveClassScheduled({
  courseId,
  courseTitle,
  sessionTitle,
  scheduledAt,
}: {
  courseId: string;
  courseTitle: string;
  sessionTitle: string;
  scheduledAt: Date;
}) {
  const now = new Date();
  const diffMs = scheduledAt.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let message: string;
  if (diffMins <= 15) {
    message = `Live class "${sessionTitle}" in ${courseTitle} is starting soon!`;
  } else if (diffMins < 60) {
    message = `Live class "${sessionTitle}" in ${courseTitle} starts in ${diffMins} minutes.`;
  } else {
    const hours = Math.floor(diffMins / 60);
    message = `Live class "${sessionTitle}" has been scheduled for ${courseTitle}.`;
  }

  await notifyEnrolledStudents({
    courseId,
    message,
    type: "LIVE_CLASS",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyCourseComment({
  courseId,
  courseTitle,
  commenterName,
  creatorId,
}: {
  courseId: string;
  courseTitle: string;
  commenterName: string | null;
  creatorId: string;
}) {
  await createNotification({
    userId: creatorId,
    message: `${commenterName || "A student"} commented on ${courseTitle}.`,
    type: "COMMENT",
    link: `/instructor/courses/${courseId}`,
  });
}

export async function notifyCourseReview({
  courseId,
  courseTitle,
  reviewerName,
  creatorId,
}: {
  courseId: string;
  courseTitle: string;
  reviewerName: string | null;
  creatorId: string;
}) {
  await createNotification({
    userId: creatorId,
    message: `${reviewerName || "A student"} left a review for ${courseTitle}.`,
    type: "REVIEW",
    link: `/instructor/courses/${courseId}`,
  });
}

export async function notifyAssignmentSubmission({
  courseId,
  courseTitle,
  studentName,
  creatorId,
}: {
  courseId: string;
  courseTitle: string;
  studentName: string | null;
  creatorId: string;
}) {
  await createNotification({
    userId: creatorId,
    message: `${studentName || "A student"} submitted an assignment in ${courseTitle}.`,
    type: "SUBMISSION",
    link: `/instructor/courses/${courseId}`,
  });
}

export async function notifyQuizSubmission({
  courseId,
  courseTitle,
  studentName,
  creatorId,
}: {
  courseId: string;
  courseTitle: string;
  studentName: string | null;
  creatorId: string;
}) {
  await createNotification({
    userId: creatorId,
    message: `${studentName || "A student"} submitted a quiz in ${courseTitle}.`,
    type: "SUBMISSION",
    link: `/instructor/courses/${courseId}`,
  });
}

export async function notifyCertificateIssued({
  userId,
  courseId,
  courseTitle,
}: {
  userId: string;
  courseId: string;
  courseTitle: string;
}) {
  await createNotification({
    userId,
    message: `Congratulations! Your certificate for ${courseTitle} has been issued.`,
    type: "CERTIFICATE",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyLiveClassReminder({
  userId,
  courseId,
  courseTitle,
  sessionTitle,
}: {
  userId: string;
  courseId: string;
  courseTitle: string;
  sessionTitle: string;
}) {
  await createNotification({
    userId,
    message: `Live class "${sessionTitle}" in ${courseTitle} is starting soon!`,
    type: "LIVE_CLASS",
    link: `/student/courses/${courseId}`,
  });
}

export async function notifyAdminNewRegistration({
  organizationId,
  userName,
  role,
}: {
  organizationId: string;
  userName: string | null;
  role: string;
}) {
  await notifyOrganizationAdmins({
    organizationId,
    message: `New ${role.toLowerCase()} registered: ${userName || "Unnamed"}. Review pending approvals.`,
    type: "ADMIN",
    link: "/admin/users",
  });
}
