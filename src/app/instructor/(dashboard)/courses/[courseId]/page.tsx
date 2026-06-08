import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookOpen, FileText, CheckCircle, LayoutList, Video, Trash2, HelpCircle, ExternalLink, GripVertical, Radio, Link2, MonitorPlay, Users, MessageSquare, MapIcon, PlayCircle, Clock } from "lucide-react";
import { notifyEnrolledStudents, createEvent } from "@/lib/notifications";
import { randomBytes } from "crypto";
import { StartClassButton } from "@/components/StartClassButton";
import { SubmissionsPanel } from "@/components/SubmissionsPanel";
import { sendLiveClassEmail } from "@/lib/mail";
import { RecordedClassesTab } from "@/components/RecordedClassesTab";
import { MaterialAnalyticsButton } from "@/components/MaterialAnalyticsButton";
import { InstructorFeedbackTab } from "@/components/admin/InstructorFeedbackTab";
import { ReadingMaterialUpload } from "@/components/ReadingMaterialUpload";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { CourseRoadmap } from "@/components/CourseRoadmap";
import { LiveSessionScheduleForm } from "@/components/LiveSessionScheduleForm";
import { DeleteLiveSessionButton } from "@/components/DeleteLiveSessionButton";
import { QuizPdfImporter } from "@/components/QuizPdfImporter";
import { getCourseBannerUrl } from "@/lib/course-images";
import { CourseCommentsTab } from "@/components/CourseCommentsTab";
import { LessonRecordButton } from "@/components/LessonRecordButton";

// --- SERVER ACTIONS ---

async function createModule(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const courseId = formData.get("courseId") as string;
  if (title && courseId) {
    await prisma.module.create({ data: { title, courseId } });
    const { triggerCourseUpdateNotifications } = await import("@/lib/email-notifications-helper");
    triggerCourseUpdateNotifications(courseId, "MODULE", title).catch((err) =>
      console.error("[createModule notification error]", err)
    );
    // Calendar event: module published now
    await createEvent({
      title: `New Module: ${title}`,
      date: new Date(),
      type: "MODULE_PUBLISH",
      courseId,
    });
    // Notify enrolled students
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    if (course) {
      await notifyEnrolledStudents({
        courseId,
        message: `New module "${title}" has been added to "${course.title}".`,
        type: "MODULE",
        link: `/student/courses/${courseId}`,
      });
    }
    revalidatePath(`/instructor/courses/${courseId}`);
  }
}

async function deleteModule(formData: FormData) {
  "use server";
  const moduleId = formData.get("moduleId") as string;
  const courseId = formData.get("courseId") as string;
  if (!moduleId) return;
  
  await prisma.lesson.deleteMany({ where: { moduleId } });
  await prisma.liveSession.deleteMany({ where: { moduleId } });
  await prisma.recordedClass.deleteMany({ where: { moduleId } });
  await prisma.module.delete({ where: { id: moduleId } });
  
  revalidatePath(`/instructor/courses/${courseId}`);
}

async function createLesson(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const moduleId = formData.get("moduleId") as string;
  const courseId = formData.get("courseId") as string;
  const videoUrl = formData.get("videoUrl") as string;
  if (title && moduleId) {
    const lesson = await prisma.lesson.create({ 
      data: { 
        title, 
        moduleId,
        videoUrl: videoUrl || null
      } 
    });

    const { triggerCourseUpdateNotifications } = await import("@/lib/email-notifications-helper");
    triggerCourseUpdateNotifications(courseId, "LESSON", title).catch((err) =>
      console.error("[createLesson notification error]", err)
    );

    if (videoUrl) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (course) {
        await prisma.adminReviewVideo.create({
          data: {
            courseId,
            moduleId,
            lessonId: lesson.id,
            instructorId: course.creatorId,
            videoUrl,
            status: "PENDING"
          }
        });
      }
    }

    revalidatePath(`/instructor/courses/${courseId}`);
  }
}


async function createAssignment(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const driveLink = formData.get("driveLink") as string;
  const courseId = formData.get("courseId") as string;
  const deadlineRaw = formData.get("deadline") as string;

  if (title && courseId) {
    const assignment = await prisma.assignment.create({ data: { title, description, driveLink, courseId } });

    const { triggerAssignmentCreatedNotifications } = await import("@/lib/email-notifications-helper");
    triggerAssignmentCreatedNotifications(assignment.id).catch((err) =>
      console.error("[createAssignment notification error]", err)
    );

    // Calendar event: assignment deadline (default 7 days from now if not provided)
    const deadlineDate = deadlineRaw ? new Date(deadlineRaw) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createEvent({
      title: `Assignment Due: ${title}`,
      date: deadlineDate,
      type: "ASSIGNMENT_DEADLINE",
      courseId,
    });

    // Notify enrolled students
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    if (course) {
      await notifyEnrolledStudents({
        courseId,
        message: `New assignment "${title}" has been posted in "${course.title}". Due: ${deadlineDate.toLocaleDateString("en-IN")}.`,
        type: "ASSIGNMENT",
        link: `/student/courses/${courseId}?tab=assignments`,
      });
    }

    revalidatePath(`/instructor/courses/${courseId}`);
  }
}

async function deleteResource(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const type = formData.get("type") as string;
  const courseId = formData.get("courseId") as string;

  // Note: reading material deletion is handled via the /api/reading-materials DELETE route
  // (which also cleans up Cloudinary assets). Only assignments are deleted here.
  if (type === "assignment") await prisma.assignment.delete({ where: { id } });
  
  revalidatePath(`/instructor/courses/${courseId}`);
}

async function togglePublish(formData: FormData) {
  "use server";
  const courseId = formData.get("courseId") as string;
  const isPublished = formData.get("isPublished") === "true";
  const course = await prisma.course.update({
    where: { id: courseId },
    data: { published: !isPublished },
    select: { title: true },
  });

  // Only fire events/notifications when PUBLISHING (not unpublishing)
  if (!isPublished) {
    await createEvent({
      title: `Course Published: ${course.title}`,
      date: new Date(),
      type: "COURSE_PUBLISHED",
      courseId,
    });
    await notifyEnrolledStudents({
      courseId,
      message: `"${course.title}" is now live! Start learning today.`,
      type: "COURSE",
      link: `/student/courses/${courseId}`,
    });
  }

  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath(`/instructor`);
}

async function createQuiz(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const courseId = formData.get("courseId") as string;
  if (title && courseId) {
    const quiz = await prisma.quiz.create({ data: { title, courseId } });
    const { triggerQuizCreatedNotifications } = await import("@/lib/email-notifications-helper");
    triggerQuizCreatedNotifications(quiz.id).catch((err) =>
      console.error("[createQuiz notification error]", err)
    );
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    if (course) {
      const { notifyQuizCreated } = await import("@/lib/notifications-service");
      notifyQuizCreated({ courseId, courseTitle: course.title, quizTitle: title });
    }
    revalidatePath(`/instructor/courses/${courseId}`);
  }
}

async function addQuestion(formData: FormData) {
  "use server";
  const quizId = formData.get("quizId") as string;
  const courseId = formData.get("courseId") as string;
  const type = formData.get("type") as string;
  const text = formData.get("text") as string;

  if (type === "MCQ") {
    const options = [
      formData.get("opt0") as string,
      formData.get("opt1") as string,
      formData.get("opt2") as string,
      formData.get("opt3") as string,
    ];
    const correctOption = parseInt(formData.get("correctOption") as string);
    await prisma.question.create({
      data: { quizId, type, text, options, correctOption, points: 1 }
    });
  } else {
    await prisma.question.create({
      data: { quizId, type, text, points: 1 }
    });
  }
  revalidatePath(`/instructor/courses/${courseId}`);
}

async function deleteQuiz(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const courseId = formData.get("courseId") as string;
  try {
    await prisma.$transaction([
      prisma.quizSubmission.deleteMany({ where: { quizId: id } }),
      prisma.question.deleteMany({ where: { quizId: id } }),
      prisma.quiz.delete({ where: { id } }),
    ]);
  } catch (error) {
    console.error("Error deleting quiz:", error);
  }
  revalidatePath(`/instructor/courses/${courseId}`);
}

async function deleteQuestion(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const courseId = formData.get("courseId") as string;
  await prisma.question.delete({ where: { id } });
  revalidatePath(`/instructor/courses/${courseId}`);
}

type LiveSessionActionState = {
  error?: string;
  success?: boolean;
};

async function createLiveSession(_state: LiveSessionActionState, formData: FormData): Promise<LiveSessionActionState> {
  "use server";
  const title = ((formData.get("title") as string) || "").trim();
  const courseId = formData.get("courseId") as string;
  const scheduledAtRaw = formData.get("scheduledAt") as string;
  const moduleId = formData.get("moduleId") as string | null;

  if (!title || title.toLowerCase() === "null") {
    return { error: "Please enter a session title" };
  }

  if (!courseId) {
    return { error: "Course is required" };
  }

  if (title && courseId) {
    const roomId = randomBytes(8).toString("hex");
    const scheduledAt = new Date(scheduledAtRaw);

    if (!scheduledAtRaw || Number.isNaN(scheduledAt.getTime())) {
      return { error: "Please select a valid class time" };
    }

    const duplicateStart = new Date(scheduledAt.getTime() - 60 * 1000);
    const duplicateEnd = new Date(scheduledAt.getTime() + 60 * 1000);
    const existingSession = await prisma.liveSession.findFirst({
      where: {
        courseId,
        scheduledAt: {
          gte: duplicateStart,
          lte: duplicateEnd,
        },
      },
      select: { id: true },
    });

    if (existingSession) {
      return { error: "A class is already scheduled at this time" };
    }

    const session = await prisma.liveSession.create({
      data: {
        roomId,
        title,
        courseId,
        status: "SCHEDULED",
        scheduledAt,
        ...(moduleId ? { moduleId } : {}),
      },
      include: {
        course: {
          include: {
            creator: { select: { name: true, email: true } },
          },
        },
      },
    });

    // ── Notifications (email + in-app) ─────────────────────────────────────
    try {
      let studentEmails: string[] = [];
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: { user: { select: { email: true } } },
      });

      if (enrollments.length > 0) {
        studentEmails = enrollments.map((e) => e.user.email);
      } else {
        const orgMembers = await prisma.organizationMember.findMany({
          where: {
            organizationId: session.course.organizationId,
            role: "STUDENT",
          },
          include: { user: { select: { email: true } } },
        });
        studentEmails = orgMembers.map((m) => m.user.email);
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const joinLink = `${appUrl}/meet/${roomId}`;
      const instructorName = session.course.creator?.name || "Your Instructor";
      const courseName = session.course.title;

      if (studentEmails.length > 0) {
        await sendLiveClassEmail({
          to: studentEmails,
          courseName,
          sessionTitle: title,
          scheduledAt,
          instructorName,
          joinLink,
        });

        await notifyEnrolledStudents({
          courseId,
          message: `New live class "${title}" scheduled for ${courseName}. Scheduled: ${scheduledAt.toLocaleString("en-IN")}. Join: ${joinLink}`,
          type: "LIVE_CLASS",
          link: `/meet/${roomId}`,
        });
      }
    } catch (notifErr) {
      console.error("[createLiveSession] Notification step failed (non-fatal):", notifErr);
    }

    revalidatePath(`/instructor/courses/${courseId}`);
    return { success: true };
  }

  return { error: "Failed to create session" };
}

async function deleteLiveSession(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const courseId = formData.get("courseId") as string;
  await prisma.liveSession.delete({ where: { id } });
  revalidatePath(`/instructor/courses/${courseId}`);
}

async function deleteDuplicateLiveSessions(formData: FormData) {
  "use server";
  const courseId = formData.get("courseId") as string;
  if (!courseId) return;

  const sessions = await prisma.liveSession.findMany({
    where: { courseId },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, scheduledAt: true },
  });

  const seen = new Set<number>();
  const duplicateIds: string[] = [];

  for (const session of sessions) {
    const key = session.scheduledAt.getTime();
    if (seen.has(key)) {
      duplicateIds.push(session.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIds.length > 0) {
    await prisma.liveSession.deleteMany({ where: { id: { in: duplicateIds } } });
  }

  revalidatePath(`/instructor/courses/${courseId}`);
}

async function deleteRecordedClass(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const courseId = formData.get("courseId") as string;
  await prisma.recordedClass.delete({ where: { id } });
  revalidatePath(`/instructor/courses/${courseId}`);
}

async function enrollStudent(formData: FormData) {
  "use server";
  const studentId = formData.get("studentId") as string;
  const courseId = formData.get("courseId") as string;
  if (studentId && courseId) {
    try {
      await prisma.enrollment.create({ data: { userId: studentId, courseId, progress: 0 } });
    } catch {
      // already enrolled, ignore
    }
    revalidatePath(`/instructor/courses/${courseId}`);
  }
}

async function markSessionOngoing(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const courseId = formData.get("courseId") as string;
  const roomId = formData.get("roomId") as string;
  await prisma.liveSession.update({ where: { id }, data: { status: "ONGOING" } });
  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/meet/${roomId}`);
}

async function issueCertificate(formData: FormData) {
  "use server";
  const studentId = formData.get("studentId") as string;
  const courseId = formData.get("courseId") as string;
  if (!studentId || !courseId) return;

  const year = new Date().getFullYear();
  const count = await prisma.certificate.count();
  const certNumber = `CERT-${year}-${String(count + 1).padStart(6, "0")}`;
  const verificationToken = `${certNumber}-${Math.random().toString(36).slice(2, 10)}`;

  const recordedClasses = await prisma.recordedClass.findMany({
    where: { courseId },
    select: { duration: true },
  });
  const totalSecs = recordedClasses.reduce((s, r) => s + (r.duration ?? 0), 0);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const courseDuration = totalSecs > 0 ? `${hrs}hrs ${mins}min ${secs}sec` : "—";

  await prisma.certificate.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: { status: "ISSUED" },
    create: {
      studentId,
      courseId,
      certificateNumber: certNumber,
      verificationToken,
      completionDate: new Date(),
      courseDuration,
      status: "ISSUED"
    }
  });

  // Notify student about certificate
  const courseInfo = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
  if (courseInfo) {
    const { notifyCertificateIssued } = await import("@/lib/notifications-service");
    notifyCertificateIssued({
      userId: studentId,
      courseId,
      courseTitle: courseInfo.title,
    });
  }

  revalidatePath(`/instructor/courses/${courseId}`);
}

async function denyCertificate(formData: FormData) {
  "use server";
  const studentId = formData.get("studentId") as string;
  const courseId = formData.get("courseId") as string;
  if (!studentId || !courseId) return;

  const year = new Date().getFullYear();
  const count = await prisma.certificate.count();
  const certNumber = `CERT-${year}-${String(count + 1).padStart(6, "0")}`;
  const verificationToken = `${certNumber}-${Math.random().toString(36).slice(2, 10)}`;

  await prisma.certificate.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: { status: "DENIED" },
    create: {
      studentId,
      courseId,
      certificateNumber: certNumber,
      verificationToken,
      completionDate: new Date(),
      courseDuration: "—",
      status: "DENIED"
    }
  });
  revalidatePath(`/instructor/courses/${courseId}`);
}

// --- PAGE COMPONENT ---

export default async function CourseBuilderPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ courseId: string }>, 
  searchParams: Promise<{ tab?: string }> 
}) {
  const { courseId } = await params;
  const { tab = "modules" } = await searchParams;

  let role: "INSTRUCTOR" | "ADMIN" = "INSTRUCTOR";
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
      const { payload } = await jwtVerify(token, secret);
      const userRole = payload.role as string;
      if (userRole === "ADMIN") {
        role = "ADMIN";
      }
    }
  } catch { }
  
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { id: 'asc' },
        include: {
          lessons: {
            orderBy: { id: 'asc' },
            include: { adminReviewVideos: true }
          },
          liveSessions: { orderBy: { createdAt: 'desc' } },
          recordedClasses: { orderBy: { createdAt: 'desc' } },
        },
      },
      assignments: { orderBy: { createdAt: 'desc' } },
      readingMaterials: { orderBy: { createdAt: 'desc' } },
      quizzes: { include: { questions: true } },
      liveSessions: { orderBy: { createdAt: 'desc' } },
    }
  });

  if (!course) redirect("/instructor");
  const courseImageUrl = getCourseBannerUrl(course.title);

  type SubmissionWithStudent = {
    id: string; assignmentId: string; studentId: string;
    driveLink: string;
    fileUrl: string | null; publicId: string | null;
    fileType: string | null; mimeType: string | null;
    fileSize: number | null; originalFileName: string | null;
    grade: number | null; maxGrade: number;
    feedback: string | null; submittedAt: Date; gradedAt: Date | null;
    student: { id: string; name: string | null; email: string };
  };
  const submissionsMap = new Map<string, SubmissionWithStudent[]>();
  try {
    const allSubs = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: { in: course.assignments.map((a) => a.id) } },
      include: {
        student: { select: { id: true, name: true, email: true } },
        file: true,
      },
      orderBy: { submittedAt: 'desc' },
    }) as SubmissionWithStudent[];
    for (const s of allSubs) {
      if (!submissionsMap.has(s.assignmentId)) submissionsMap.set(s.assignmentId, []);
      submissionsMap.get(s.assignmentId)!.push(s);
    }
  } catch { }

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: "asc" },
  });

  const pendingEnrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { enrolledAt: "desc" },
  });

  // Fetch certificates for this course to show status in Students Info
  const courseCertificates = await prisma.certificate.findMany({
    where: { courseId },
  });
  const certMap = new Map(courseCertificates.map(c => [c.studentId, c.status]));

  // Fetch org students NOT enrolled in this course (for instructor to add)
  const enrolledIds = [...enrollments.map((e) => e.userId), ...pendingEnrollments.map((e) => e.userId)];
  const unenrolledMembers = await prisma.organizationMember.findMany({
    where: {
      organizationId: course.organizationId,
      role: "STUDENT",
      userId: { notIn: enrolledIds },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: "desc" },
  });

  const studentIds = enrollments.map((e) => e.userId);
  const [assignmentSubs, quizSubs] = await Promise.all([
    prisma.assignmentSubmission.findMany({
      where: { assignment: { courseId }, studentId: { in: studentIds } },
      select: { studentId: true },
    }),
    prisma.quizSubmission.findMany({
      where: { quiz: { courseId }, studentId: { in: studentIds } },
      select: { studentId: true },
    }),
  ]);
  let materialViews: { studentId: string; materialId: string }[] = [];
  try {
    materialViews = await prisma.materialView.findMany({
      where: { material: { courseId }, studentId: { in: studentIds } },
      select: { studentId: true, materialId: true },
    });
  } catch (err) {
    console.error("[StudentsInfo] materialView query failed:", err);
  }

  const totalAssignments = course.assignments.length;
  const totalQuizzes = course.quizzes.length;
  const totalMaterials = course.readingMaterials.length;
  const totalActivities = totalAssignments + totalQuizzes + totalMaterials;

  const seenLiveSessionTimes = new Set<number>();
  const duplicateLiveSessionCount = course.liveSessions.reduce((count, session) => {
    const key = session.scheduledAt.getTime();
    if (seenLiveSessionTimes.has(key)) {
      return count + 1;
    }
    seenLiveSessionTimes.add(key);
    return count;
  }, 0);

  const getTabStyle = (currentTab: string) => {
    const isActive = tab === currentTab;
    return {
      background: isActive ? "rgba(217,37,42,0.12)" : "transparent",
      color: isActive ? "#D9252A" : "var(--muted-foreground)",
      fontWeight: isActive ? 600 : 500,
    };
  };

  return (
    <div className="course-theme-scope container-page space-y-8">
      {/* Course Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <Link href="/instructor">
          <Button
            variant="ghost"
            style={{ color: "var(--muted-foreground)" }}
            className="hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] px-0 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Workspace
          </Button>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{course.title}</h1>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border whitespace-nowrap"
            style={
              course.published
                ? { background: "rgba(217,37,42,0.12)", color: "#D9252A", borderColor: "rgba(217,37,42,0.25)" }
                : { background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)", borderColor: "var(--border)" }
            }
          >
            {course.published ? 'PUBLISHED' : 'DRAFT'}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Course banner */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <img
            src={courseImageUrl}
            alt=""
            className="w-full h-[240px] object-cover"
          />
        </div>
        
        <div className="flex justify-end gap-3 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
          <form action={togglePublish}>
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="isPublished" value={course.published.toString()} />
            <Button
              type="submit"
              style={
                course.published
                  ? { background: "var(--secondary-background)", color: "var(--foreground)", border: "1px solid var(--border)" }
                  : { background: "#D9252A", color: "#FFFFFF" }
              }
              className="font-bold text-xs uppercase tracking-wider transition-colors hover:opacity-90"
            >
              {course.published ? "Unpublish" : "Publish"}
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
          
          {/* SIDEBAR */}
          <div className="space-y-4">
            <Link href={`/instructor/courses/${course.id}/roadmap`}>
              <Button
                variant="ghost"
                className="w-full justify-start transition-all hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                style={{ color: "var(--muted-foreground)" }}
              >
                <MapIcon className="w-4 h-4 mr-2" /> View Interactive Roadmap
              </Button>
            </Link>
            <div className="space-y-2">
              <Link href={`?tab=modules`}>
                <Button
                  variant="ghost"
                  style={getTabStyle("modules")}
                  className="w-full justify-start transition-all hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                >
                  <LayoutList className="w-4 h-4 mr-2" /> Modules
                </Button>
              </Link>
              <Link href={`?tab=reading`}>
                <Button
                  variant="ghost"
                  style={getTabStyle("reading")}
                  className="w-full justify-start transition-all hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                >
                  <FileText className="w-4 h-4 mr-2" /> Reading Materials
                </Button>
              </Link>
              <Link href={`?tab=assignments`}>
                <Button
                  variant="ghost"
                  style={getTabStyle("assignments")}
                  className="w-full justify-start transition-all hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Assignments
                </Button>
              </Link>
              <Link href={`?tab=quizzes`}>
                <Button
                  variant="ghost"
                  style={getTabStyle("quizzes")}
                  className="w-full justify-start transition-all hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                >
                  <HelpCircle className="w-4 h-4 mr-2" /> Quizzes & Tests
                </Button>
              </Link>
              <Link href={`?tab=comments`}>
                <Button
                  variant="ghost"
                  style={getTabStyle("comments")}
                  className="w-full justify-start transition-all hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Q&A Discussions
                </Button>
              </Link>
              <Link href={`?tab=students`}>
                <Button
                  variant="ghost"
                  style={getTabStyle("students")}
                  className="w-full justify-start transition-all hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                >
                  <Users className="w-4 h-4 mr-2" /> Students Info{" "}
                  {pendingEnrollments.length > 0 && (
                    <span className="ml-auto bg-[#D9252A] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingEnrollments.length}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href={`?tab=adminfeedback`}>
                <Button
                  variant="ghost"
                  style={getTabStyle("adminfeedback")}
                  className="w-full justify-start transition-all hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Admin Feedback
                </Button>
              </Link>
            </div>
          </div>

          <div className="md:col-span-3">
            
            {/* MODULES TAB */}
            {tab === "modules" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutList className="w-6 h-6" style={{ color: "var(--muted-foreground)" }} />
                  <h3 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Course Modules</h3>
                  {duplicateLiveSessionCount > 0 && (
                    <form action={deleteDuplicateLiveSessions} className="ml-auto">
                      <input type="hidden" name="courseId" value={courseId} />
                      <Button type="submit" variant="outline" size="sm" className="h-8 text-[#D9252A] hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A]">
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete All Duplicates
                      </Button>
                    </form>
                  )}
                </div>
                {course.modules.length === 0 ? (
                  <div
                    className="text-center py-16 text-sm rounded-lg border"
                    style={{ color: "var(--muted-foreground)", background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    No modules yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {course.modules.map((mod, idx) => (
                      <Card key={mod.id} style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
                        <CardHeader
                          style={{ background: "var(--secondary-background)", borderBottom: "1px solid var(--border)" }}
                          className="pb-3"
                        >
                          <CardTitle className="text-lg font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                              <span
                                className="px-2 py-0.5 rounded text-xs border"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  borderColor: "var(--border)",
                                  color: "var(--foreground)",
                                }}
                              >
                                Module {idx + 1}
                              </span>
                              {mod.title}
                            </span>
                            <form action={deleteModule}>
                              <input type="hidden" name="moduleId" value={mod.id} />
                              <input type="hidden" name="courseId" value={courseId} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="h-8 transition-colors hover:bg-[rgba(217,37,42,0.08)]"
                                style={{ color: "#D9252A" }}
                              >
                                Delete Module
                              </Button>
                            </form>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          {/* Lessons Section */}
                          <details
                            className="group border rounded-md"
                            style={{ borderColor: "var(--border)", background: "var(--secondary-background)" }}
                            open
                          >
                              <summary
                                className="font-semibold text-sm cursor-pointer p-3 outline-none transition-colors list-none flex justify-between hover:bg-[rgba(217,37,42,0.04)] hover:text-[#D9252A]"
                                style={{ color: "var(--foreground)" }}
                              >
                                Lessons
                                <span className="text-[var(--muted-foreground)] group-open:rotate-180 transition-transform">▼</span>
                              </summary>
                            <div className="p-3 pt-0 space-y-2" style={{ background: "var(--card)" }}>
                              {mod.lessons.map(l => (
                                <div
                                  key={l.id}
                                  className="flex items-center justify-between text-sm pb-2 last:border-0 last:pb-0"
                                  style={{ borderBottom: "1px solid var(--border)" }}
                                >
                                  <span style={{ color: "var(--foreground)" }}>{l.title}</span>
                                  <LessonRecordButton
                                    courseId={courseId}
                                    moduleId={mod.id}
                                    lessonId={l.id}
                                    lessonTitle={l.title}
                                    isSubmitted={!!l.videoUrl || (l.adminReviewVideos && l.adminReviewVideos.length > 0)}
                                    videoUrl={l.videoUrl || l.adminReviewVideos[0]?.videoUrl}
                                  />
                                </div>
                              ))}
                              {mod.lessons.length === 0 && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>No lessons.</div>}
                              <div className="pt-2">
                                <form action={createLesson} className="flex flex-col sm:flex-row gap-2">
                                  <input type="hidden" name="moduleId" value={mod.id} />
                                  <input type="hidden" name="courseId" value={courseId} />
                                  <Input
                                    name="title"
                                    placeholder="New lesson title..."
                                    required
                                    style={{
                                      background: "var(--secondary-background)",
                                      border: "1px solid var(--border)",
                                      color: "var(--foreground)",
                                    }}
                                    className="h-8 text-sm focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
                                  />
                                  <Input
                                    name="videoUrl"
                                    placeholder="Video URL (optional)"
                                    style={{
                                      background: "var(--secondary-background)",
                                      border: "1px solid var(--border)",
                                      color: "var(--foreground)",
                                    }}
                                    className="h-8 text-sm focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    style={{ background: "#D9252A", color: "#FFFFFF" }}
                                    className="h-8 hover:bg-[#C21F24] transition-colors"
                                  >
                                    Add Lesson
                                  </Button>
                                </form>
                              </div>
                            </div>
                          </details>

                          {/* Live Classes Section */}
                          <details
                            className="group border rounded-md"
                            style={{ borderColor: "var(--border)", background: "var(--secondary-background)" }}
                          >
                              <summary
                                className="font-semibold text-sm cursor-pointer p-3 outline-none transition-colors list-none flex justify-between hover:bg-[rgba(217,37,42,0.04)] hover:text-[#D9252A]"
                                style={{ color: "var(--foreground)" }}
                              >
                                Live Classes
                                <span className="text-[var(--muted-foreground)] group-open:rotate-180 transition-transform">▼</span>
                              </summary>
                            <div className="p-3 pt-0 space-y-2" style={{ background: "var(--card)" }}>
                              {mod.liveSessions.map(l => {
                                const isOngoing = l.status === "ONGOING";
                                const isCompleted = l.status === "COMPLETED";
                                return (
                                  <div key={l.id} className="flex flex-col gap-2 text-sm p-3 rounded-md mb-2 border" style={{ borderColor: "var(--border)" }}>
                                    <div className="flex justify-between items-center">
                                      <div className="flex flex-col">
                                        <span className="font-bold" style={{ color: "var(--foreground)" }}>{l.title}</span>
                                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{new Date(l.scheduledAt).toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded border"
                                          style={
                                            isOngoing
                                              ? { background: "rgba(217,37,42,0.12)", color: "#D9252A", borderColor: "rgba(217,37,42,0.25)" }
                                              : isCompleted
                                              ? { background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)", borderColor: "var(--border)" }
                                              : { background: "rgba(255,255,255,0.06)", color: "var(--foreground)", borderColor: "var(--border)" }
                                          }
                                        >
                                          {l.status}
                                        </span>
                                        <DeleteLiveSessionButton sessionId={l.id} />
                                      </div>
                                    </div>
                                    {l.status !== "COMPLETED" && (
                                      <div className="mt-2">
                                        <StartClassButton sessionId={l.id} roomId={l.roomId} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {mod.liveSessions.length === 0 && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>No live classes scheduled.</div>}
                              <div className="pt-2 border-t mt-2" style={{ borderColor: "var(--border)" }}>
                                <LiveSessionScheduleForm
                                  courseId={courseId}
                                  moduleId={mod.id}
                                  createLiveSessionAction={createLiveSession}
                                />
                              </div>
                            </div>
                          </details>

                          {/* Recorded Videos Section */}
                          <details
                            className="group border rounded-md"
                            style={{ borderColor: "var(--border)", background: "var(--secondary-background)" }}
                          >
                              <summary
                                className="font-semibold text-sm cursor-pointer p-3 outline-none transition-colors list-none flex justify-between hover:bg-[rgba(217,37,42,0.04)] hover:text-[#D9252A]"
                                style={{ color: "var(--foreground)" }}
                              >
                                Recorded Videos
                                <span className="text-[var(--muted-foreground)] group-open:rotate-180 transition-transform">▼</span>
                              </summary>
                            <div className="p-3 pt-0 space-y-2" style={{ background: "var(--card)" }}>
                              {mod.recordedClasses.map(l => (
                                <div
                                  key={l.id}
                                  className="flex items-center justify-between text-sm pb-2 last:border-0 last:pb-0"
                                  style={{ borderBottom: "1px solid var(--border)" }}
                                >
                                  <VideoPlayerModal videoUrl={l.videoUrl} title={l.title} duration={l.duration}>
                                    <span
                                      style={{ color: "var(--foreground)" }}
                                      className="flex items-center gap-2 hover:text-[#D9252A] transition-colors cursor-pointer"
                                    >
                                      <PlayCircle className="w-4 h-4" style={{ color: "#D9252A" }} />
                                      {l.title}
                                    </span>
                                  </VideoPlayerModal>
                                  <form action={deleteRecordedClass}>
                                    <input type="hidden" name="id" value={l.id} />
                                    <input type="hidden" name="courseId" value={courseId} />
                                    <Button
                                      type="submit"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 transition-colors hover:bg-[rgba(217,37,42,0.08)]"
                                      style={{ color: "#D9252A" }}
                                    >
                                      Delete
                                    </Button>
                                  </form>
                                </div>
                              ))}
                              {mod.recordedClasses.length === 0 && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>No recorded videos.</div>}
                            </div>
                          </details>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <Card
                  className="border-dashed border-2 p-6"
                  style={{ borderColor: "var(--border)", background: "transparent", boxShadow: "none" }}
                >
                  <form action={createModule} className="flex gap-4 items-end">
                    <input type="hidden" name="courseId" value={courseId} />
                    <div className="flex-1 space-y-2">
                      <Label style={{ color: "var(--muted-foreground)" }}>New Module</Label>
                      <Input
                        name="title"
                        required
                        placeholder="Week 1..."
                        style={{
                          background: "var(--secondary-background)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                        className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
                      />
                    </div>
                    <Button
                      type="submit"
                      style={{ background: "#D9252A", color: "#FFFFFF" }}
                      className="hover:bg-[#C21F24] transition-colors"
                    >
                      Create Module
                    </Button>
                  </form>
                </Card>
              </div>
            )}

            {/* READING TAB */}
            {tab === "reading" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Reading Materials</h2>
                <ReadingMaterialUpload courseId={courseId} />
              </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {tab === "assignments" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Course Assignments</h2>
                <Card style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
                  <CardHeader><CardTitle className="text-lg" style={{ color: "var(--foreground)" }}>Create Assignment</CardTitle></CardHeader>
                  <CardContent>
                    <form action={createAssignment} className="space-y-4">
                      <input type="hidden" name="courseId" value={courseId} />
                      <div className="space-y-2">
                        <Label style={{ color: "var(--muted-foreground)" }}>Title</Label>
                        <Input
                          name="title"
                          required
                          placeholder="Final Project"
                          style={{
                            background: "var(--secondary-background)",
                            border: "1px solid var(--border)",
                            color: "var(--foreground)",
                          }}
                          className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: "var(--muted-foreground)" }}>Description</Label>
                        <Textarea
                          name="description"
                          placeholder="Instructions..."
                          style={{
                            background: "var(--secondary-background)",
                            border: "1px solid var(--border)",
                            color: "var(--foreground)",
                          }}
                          className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: "var(--muted-foreground)" }}>Problem Statement (Drive)</Label>
                        <Input
                          name="driveLink"
                          placeholder="https://drive..."
                          style={{
                            background: "var(--secondary-background)",
                            border: "1px solid var(--border)",
                            color: "var(--foreground)",
                          }}
                          className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: "var(--muted-foreground)" }}>
                          Deadline <span style={{ color: "var(--muted-foreground)" }} className="font-normal">(optional — defaults to 7 days)</span>
                        </Label>
                        <Input
                          name="deadline"
                          type="datetime-local"
                          style={{
                            background: "var(--secondary-background)",
                            border: "1px solid var(--border)",
                            color: "var(--foreground)",
                          }}
                          className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A]"
                        />
                      </div>
                      <Button
                        type="submit"
                        style={{ background: "#D9252A", color: "#FFFFFF" }}
                        className="w-full hover:bg-[#C21F24] transition-colors"
                      >
                        Add Assignment
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                {course.assignments.map((asgn) => (
                  <Card key={asgn.id} className="p-0 overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }}>
                    <div className="h-1 w-full" style={{ background: "#D9252A" }} />
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg" style={{ color: "var(--foreground)" }}>{asgn.title}</h3>
                          {asgn.description && <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{asgn.description}</p>}
                          {asgn.driveLink && (
                            <a
                              href={asgn.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs hover:underline mt-1 flex items-center gap-1 font-semibold"
                              style={{ color: "#D9252A" }}
                            >
                              <ExternalLink className="w-3 h-3" /> View Problem Statement
                            </a>
                          )}
                        </div>
                        <form action={deleteResource} className="shrink-0">
                          <input type="hidden" name="id" value={asgn.id} />
                          <input type="hidden" name="type" value="assignment" />
                          <input type="hidden" name="courseId" value={courseId} />
                          <Button
                            type="submit"
                            variant="ghost"
                            className="transition-colors hover:bg-[rgba(217,37,42,0.08)]"
                            style={{ color: "#D9252A" }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>

                      {/* Submissions panel */}
                      <SubmissionsPanel
                        assignmentId={asgn.id}
                        assignmentTitle={asgn.title}
                        initialSubmissions={(submissionsMap.get(asgn.id) ?? []).map((s: SubmissionWithStudent) => ({
                          id: s.id,
                          studentId: s.studentId,
                          driveLink: s.driveLink,
                          fileId: (s as unknown as { fileId?: string | null }).fileId ?? null,
                          file:   (s as unknown as { file?: unknown }).file as never ?? null,
                          fileUrl:          s.fileUrl          ?? null,
                          fileType:         s.fileType         ?? null,
                          mimeType:         s.mimeType         ?? null,
                          fileSize:         s.fileSize         ?? null,
                          originalFileName: s.originalFileName ?? null,
                          grade:    s.grade,
                          maxGrade: s.maxGrade,
                          feedback: s.feedback ?? null,
                          submittedAt: s.submittedAt.toISOString(),
                          gradedAt:    s.gradedAt?.toISOString() ?? null,
                          student: s.student,
                        }))}
                      />
                    </div>
                  </Card>
                ))}
                {course.assignments.length === 0 && <p className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>No assignments created yet.</p>}
              </div>
            )}

            {/* QUIZZES TAB */}
            {tab === "quizzes" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Quiz Management</h2>
                  <form action={createQuiz} className="flex gap-2">
                    <input type="hidden" name="courseId" value={courseId} />
                    <Input
                      name="title"
                      required
                      placeholder="Quiz Name..."
                      style={{
                        background: "var(--secondary-background)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                      }}
                      className="w-64 focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A] placeholder:text-[var(--muted-foreground)]"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      style={{ background: "#D9252A", color: "#FFFFFF" }}
                      className="hover:bg-[#C21F24] font-semibold transition-colors shrink-0"
                    >
                      Create Quiz
                    </Button>
                  </form>
                </div>

                {course.quizzes.map((quiz) => (
                  <Card key={quiz.id} style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "none" }} className="overflow-hidden">
                    <CardHeader
                      style={{ background: "var(--secondary-background)", borderBottom: "1px solid var(--border)" }}
                      className="py-4"
                    >
                      <div className="flex flex-row justify-between items-center w-full">
                        <div>
                          <CardTitle className="text-lg" style={{ color: "var(--foreground)" }}>{quiz.title}</CardTitle>
                          <CardDescription style={{ color: "var(--muted-foreground)" }}>{quiz.questions.length} Questions total</CardDescription>
                        </div>
                        <form action={deleteQuiz}>
                          <input type="hidden" name="id" value={quiz.id} />
                          <input type="hidden" name="courseId" value={courseId} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="transition-colors hover:bg-[rgba(217,37,42,0.08)]"
                            style={{ color: "#D9252A" }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      
                      {/* List Questions */}
                      <div className="space-y-4">
                        {quiz.questions.map((q, qIdx) => (
                          <div key={q.id} className="p-4 border rounded-md relative group" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#D9252A" }}>
                                  {q.type === "MCQ" ? "Single Choice" : q.type === "MULTIPLE" ? "Multiple Choice" : q.type}
                                </span>
                                <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>1 Mark</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <form action={deleteQuestion}>
                                  <input type="hidden" name="id" value={q.id} />
                                  <input type="hidden" name="courseId" value={courseId} />
                                  <Button type="submit" variant="ghost" size="sm" className="text-[#D9252A] hover:text-[#C21F24] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </form>
                              </div>
                            </div>
                            <p className="font-medium mt-1" style={{ color: "var(--foreground)" }}>{qIdx + 1}. {q.text}</p>
                            {q.type === "MCQ" && (
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                {q.options.map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    style={
                                      q.correctOption === oIdx
                                        ? { background: "rgba(217,37,42,0.12)", borderColor: "rgba(217,37,42,0.25)", color: "#D9252A" }
                                        : { background: "var(--secondary-background)", borderColor: "var(--border)", color: "var(--foreground)" }
                                    }
                                    className="flex items-center gap-2 text-sm p-2 rounded border font-medium"
                                  >
                                    <input
                                      type="radio"
                                      checked={q.correctOption === oIdx}
                                      readOnly
                                      className="accent-[#D9252A]"
                                    />
                                    <span>{opt}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* PDF Import */}
                      <div className="pt-6 border-t border-[var(--border)]">
                        <QuizPdfImporter
                          quizId={quiz.id}
                          courseId={courseId}
                        />
                      </div>

                      {/* Add Question Form */}
                      <div className="pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                        <p className="text-sm font-bold mb-4" style={{ color: "var(--foreground)" }}>Add New Question</p>
                        <form action={addQuestion} className="space-y-4">
                          <input type="hidden" name="quizId" value={quiz.id} />
                          <input type="hidden" name="courseId" value={courseId} />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label style={{ color: "var(--muted-foreground)" }}>Question Type</Label>
                              <select
                                name="type"
                                defaultValue="MCQ"
                                style={{
                                  background: "var(--secondary-background)",
                                  borderColor: "var(--border)",
                                  color: "var(--foreground)",
                                }}
                                className="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D9252A]"
                              >
                                <option value="MCQ">Single Choice</option>
                                <option value="ESSAY">Essay (Manual)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label style={{ color: "var(--muted-foreground)" }}>Question Text</Label>
                              <Input
                                name="text"
                                required
                                placeholder="What is the capital of..."
                                style={{
                                  background: "var(--secondary-background)",
                                  borderColor: "var(--border)",
                                  color: "var(--foreground)",
                                }}
                                className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A]"
                              />
                            </div>
                          </div>

                          <div className="p-4 rounded-md space-y-3" style={{ background: "var(--secondary-background)" }}>
                            <Label className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>Answer Options</Label>
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="correctOption"
                                  value={i}
                                  defaultChecked={i === 0}
                                  className="accent-[#D9252A] shrink-0"
                                />
                                <Input
                                  name={`opt${i}`}
                                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                  style={{
                                    background: "var(--card)",
                                    borderColor: "var(--border)",
                                    color: "var(--foreground)",
                                  }}
                                  className="focus-visible:ring-1 focus-visible:ring-[#D9252A] focus-visible:border-[#D9252A]"
                                />
                              </div>
                            ))}
                            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                              Select the radio button next to the correct answer
                            </p>
                          </div>
                          
                          <Button
                            type="submit"
                            style={{
                              background: "var(--secondary-background)",
                              color: "var(--foreground)",
                              border: "1px solid var(--border)",
                            }}
                            className="w-full hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A]"
                          >
                            <HelpCircle className="w-4 h-4 mr-2" /> Save Question to Quiz
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {course.quizzes.length === 0 && <p className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>No quizzes created yet.</p>}
              </div>
            )}



            {/* STUDENTS INFO TAB */}
            {tab === "students" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-6 h-6" style={{ color: "#D9252A" }} />
                    <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Students Info</h2>
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full border"
                    style={{
                      background: "rgba(217,37,42,0.12)",
                      borderColor: "rgba(217,37,42,0.25)",
                      color: "#D9252A",
                    }}
                  >
                    {enrollments.length} enrolled
                  </span>
                </div>

                {/* Pending Requests Section */}
                {pendingEnrollments.length > 0 && (
                  <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "rgba(217,37,42,0.25)" }}>
                    <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ background: "rgba(217,37,42,0.06)", borderColor: "rgba(217,37,42,0.15)" }}>
                      <Clock className="w-4 h-4" style={{ color: "#D9252A" }} />
                      <h3 className="text-sm font-bold" style={{ color: "#D9252A" }}>Pending Requests</h3>
                      <span
                        className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border"
                        style={{
                          background: "rgba(217,37,42,0.12)",
                          borderColor: "rgba(217,37,42,0.25)",
                          color: "#D9252A",
                        }}
                      >
                        {pendingEnrollments.length} waiting
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="space-y-2">
                        {pendingEnrollments.map((enr) => (
                          <div key={enr.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-[rgba(217,37,42,0.04)] transition-colors" style={{ borderColor: "var(--border)" }}>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border" style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}>
                              <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                                {(enr.user.name ?? enr.user.email)[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{enr.user.name ?? "—"}</p>
                              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{enr.user.email}</p>
                              <p className="text-xs mt-0.5" style={{ color: "#D9252A" }}>
                                Requested {new Date(enr.enrolledAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <form action={async (formData: FormData) => {
                                "use server";
                                const enrollmentId = formData.get("enrollmentId") as string;
                                await prisma.enrollment.update({
                                  where: { id: enrollmentId },
                                  data: { status: "ACTIVE" }
                                });
                                const enrollment = await prisma.enrollment.findUnique({
                                  where: { id: enrollmentId },
                                  include: { course: true, user: true }
                                });
                                if (enrollment) {
                                  await prisma.notification.create({
                                    data: {
                                      userId: enrollment.userId,
                                      message: `Your request to join ${enrollment.course.title} has been accepted!`,
                                      type: "COURSE",
                                      link: `/student/courses/${enrollment.courseId}`,
                                    }
                                  });
                                }
                                revalidatePath(`/instructor/courses/${courseId}`);
                              }}>
                                <input type="hidden" name="enrollmentId" value={enr.id} />
                                <button
                                  type="submit"
                                  style={{
                                    background: "rgba(217,37,42,0.12)",
                                    borderColor: "rgba(217,37,42,0.25)",
                                    color: "#D9252A",
                                  }}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors hover:bg-[rgba(217,37,42,0.18)] cursor-pointer"
                                >
                                  Accept
                                </button>
                              </form>
                              <form action={async (formData: FormData) => {
                                "use server";
                                const enrollmentId = formData.get("enrollmentId") as string;
                                await prisma.enrollment.update({
                                  where: { id: enrollmentId },
                                  data: { status: "REJECTED" }
                                });
                                const enrollment = await prisma.enrollment.findUnique({
                                  where: { id: enrollmentId },
                                  include: { course: true, user: true }
                                });
                                if (enrollment) {
                                  await prisma.notification.create({
                                    data: {
                                      userId: enrollment.userId,
                                      message: `Your request to join ${enrollment.course.title} was not accepted.`,
                                      type: "COURSE",
                                      link: `/student/courses`,
                                    }
                                  });
                                }
                                revalidatePath(`/instructor/courses/${courseId}`);
                              }}>
                                <input type="hidden" name="enrollmentId" value={enr.id} />
                                <button
                                  type="submit"
                                  style={{
                                    background: "var(--secondary-background)",
                                    color: "var(--foreground)",
                                    border: "1px solid var(--border)",
                                  }}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors hover:bg-[rgba(217,37,42,0.08)] hover:text-[#D9252A] hover:border-[#D9252A] cursor-pointer"
                                >
                                  Reject
                                </button>
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Students Section */}
                {unenrolledMembers.length > 0 && (
                  <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ background: "var(--secondary-background)", borderColor: "var(--border)" }}>
                      <Users className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                      <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Add Students</h3>
                      <span
                        className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          borderColor: "var(--border)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {unenrolledMembers.length} available
                      </span>
                    </div>
                    <div className="p-3 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unenrolledMembers.map((m) => (
                          <form key={m.id} action={enrollStudent} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-[rgba(217,37,42,0.04)] transition-colors" style={{ borderColor: "var(--border)" }}>
                            <input type="hidden" name="courseId" value={courseId} />
                            <input type="hidden" name="studentId" value={m.user.id} />
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border" style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}>
                              <span className="text-[10px] font-bold" style={{ color: "var(--foreground)" }}>
                                {(m.user.name ?? m.user.email)[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{m.user.name ?? "—"}</p>
                              <p className="text-[10px] truncate" style={{ color: "var(--muted-foreground)" }}>{m.user.email}</p>
                            </div>
                            <button
                              type="submit"
                              style={{
                                background: "rgba(217,37,42,0.12)",
                                color: "#D9252A",
                              }}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors shrink-0 cursor-pointer"
                            >
                              + Enroll
                            </button>
                          </form>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {enrollments.length === 0 ? (
                  <div
                    className="text-center py-16 rounded-xl border"
                    style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                  >
                    <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--border)" }} />
                    <p className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>No students enrolled yet.</p>
                    <p className="text-sm mt-1">Students will appear here once they enrol in this course.</p>
                  </div>
                  ) : (
                  <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "none" }}>
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
                      <thead>
                        <tr style={{ background: "var(--secondary-background)", borderBottom: "1px solid var(--border)" }}>
                          <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest w-12" style={{ color: "var(--muted-foreground)" }}>#</th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Student</th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Email</th>
                          <th className="text-center px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Assignments</th>
                          <th className="text-center px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Quizzes</th>
                          <th className="text-center px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Materials</th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Progress</th>
                          <th className="text-center px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Certificate Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {enrollments.map((enr, idx) => {
                          const asgDone = assignmentSubs.filter(s => s.studentId === enr.userId).length;
                          const qzDone  = quizSubs.filter(s => s.studentId === enr.userId).length;
                          const matDone = new Set(
                            materialViews
                              .filter(s => s.studentId === enr.userId)
                              .map(s => s.materialId)
                          ).size;
                          const done    = asgDone + qzDone + matDone;
                          const pct     = totalActivities > 0 ? Math.round((done / totalActivities) * 100) : 0;
                          return (
                            <tr
                              key={enr.id}
                              className="transition-colors hover:bg-[rgba(217,37,42,0.04)]"
                            >
                              <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{idx + 1}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border" style={{ background: "rgba(255,255,255,0.06)", borderColor: "var(--border)" }}>
                                    <span className="text-xs font-bold" style={{ color: "var(--foreground)" }}>
                                      {(enr.user.name ?? enr.user.email)[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>{enr.user.name ?? "—"}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>{enr.user.email}</td>
                              <td className="px-5 py-3 text-center">
                                <span
                                  className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                                  style={
                                    asgDone === totalAssignments && totalAssignments > 0
                                      ? { background: "rgba(217,37,42,0.12)", color: "#D9252A", borderColor: "rgba(217,37,42,0.25)" }
                                      : { background: "rgba(255,255,255,0.06)", color: "var(--foreground)", borderColor: "var(--border)" }
                                  }
                                >
                                  {asgDone}/{totalAssignments}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span
                                  className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                                  style={
                                    qzDone === totalQuizzes && totalQuizzes > 0
                                      ? { background: "rgba(217,37,42,0.12)", color: "#D9252A", borderColor: "rgba(217,37,42,0.25)" }
                                      : { background: "rgba(255,255,255,0.06)", color: "var(--foreground)", borderColor: "var(--border)" }
                                  }
                                >
                                  {qzDone}/{totalQuizzes}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span
                                  className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                                  style={
                                    matDone === totalMaterials && totalMaterials > 0
                                      ? { background: "rgba(217,37,42,0.12)", color: "#D9252A", borderColor: "rgba(217,37,42,0.25)" }
                                      : { background: "rgba(255,255,255,0.06)", color: "var(--foreground)", borderColor: "var(--border)" }
                                  }
                                >
                                  {matDone}/{totalMaterials}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold" style={{ color: "var(--foreground)" }}>{pct}%</span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {(() => {
                                  const explicitStatus = certMap.get(enr.userId);
                                  const effectiveStatus = explicitStatus ?? (pct === 100 ? "ELIGIBLE" : "NOT_ELIGIBLE");
                                  
                                  if (effectiveStatus === "NOT_ELIGIBLE") {
                                    return <span className="text-xs text-[var(--muted-foreground)] font-semibold bg-[var(--secondary-background)] px-2 py-1 rounded-full">Not Eligible</span>;
                                  } else if (effectiveStatus === "ELIGIBLE") {
                                    return (
                                      <div className="flex flex-col gap-1 items-center">
                                        <span className="text-xs text-amber-600 font-semibold bg-amber-100 px-2 py-1 rounded-full mb-1">Eligible</span>
                                        <div className="flex gap-1">
                                          <form action={issueCertificate}>
                                            <input type="hidden" name="studentId" value={enr.userId} />
                                            <input type="hidden" name="courseId" value={courseId} />
                                            <button type="submit" className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded transition-colors">Issue</button>
                                          </form>
                                          <form action={denyCertificate}>
                                            <input type="hidden" name="studentId" value={enr.userId} />
                                            <input type="hidden" name="courseId" value={courseId} />
                                            <button type="submit" className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded transition-colors">Deny</button>
                                          </form>
                                        </div>
                                      </div>
                                    );
                                  } else if (effectiveStatus === "ISSUED") {
                                    return <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 px-2 py-1 rounded-full">Issued</span>;
                                  } else if (effectiveStatus === "DENIED") {
                                    return <span className="text-xs text-red-700 font-semibold bg-red-100 px-2 py-1 rounded-full">Denied</span>;
                                  }
                                })()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ADMIN FEEDBACK TAB */}
            {tab === "adminfeedback" && (
              <InstructorFeedbackTab courseId={courseId} />
            )}

            {/* Q&A DISCUSSIONS TAB */}
            {tab === "comments" && (
              <CourseCommentsTab courseId={courseId} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
