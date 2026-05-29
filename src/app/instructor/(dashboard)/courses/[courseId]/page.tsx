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

// --- SERVER ACTIONS ---

async function createModule(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const courseId = formData.get("courseId") as string;
  if (title && courseId) {
    await prisma.module.create({ data: { title, courseId } });
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
    await prisma.lesson.create({ 
      data: { 
        title, 
        moduleId,
        videoUrl: videoUrl || null
      } 
    });
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
    await prisma.assignment.create({ data: { title, description, driveLink, courseId } });

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
    await prisma.quiz.create({ data: { title, courseId } });
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
  await prisma.quiz.delete({ where: { id } });
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

  if (!title) {
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
    // Wrapped in try/catch so any failure is logged but NEVER breaks room creation
    try {
      // 1. Collect enrolled student emails for this course
      let studentEmails: string[] = [];
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: { user: { select: { email: true } } },
      });

      if (enrollments.length > 0) {
        studentEmails = enrollments.map((e) => e.user.email);
      } else {
        // Fallback: all STUDENT members of the same organisation
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
        // 2. Rich HTML email — subject: "New Live Class Scheduled"
        await sendLiveClassEmail({
          to: studentEmails,
          courseName,
          sessionTitle: title,
          scheduledAt,
          instructorName,
          joinLink,
        });
        console.log(
          `[createLiveSession] 📧 Email sent to ${studentEmails.length} student(s) for session "${title}"`
        );

        // 3. In-app notification for all enrolled students
        await notifyEnrolledStudents({
          courseId,
          message: `📡 New live class "${title}" scheduled for ${courseName}. Scheduled: ${scheduledAt.toLocaleString("en-IN")}. Join: ${joinLink}`,
          type: "LIVE_CLASS",
          link: `/meet/${roomId}`,
        });
      } else {
        console.log("[createLiveSession] No enrolled students found to notify.");
      }
    } catch (notifErr) {
      // Log but never re-throw — session creation succeeds regardless
      console.error("[createLiveSession] Notification step failed (non-fatal):", notifErr);
    }
    // ───────────────────────────────────────────────────────────────────────

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
      // unique constraint — already enrolled, ignore
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

  // Get logged-in role from JWT cookie
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
  } catch { /* default to INSTRUCTOR */ }
  
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { id: 'asc' },
        include: {
          lessons: { orderBy: { id: 'asc' } },
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

  // Fetch submissions for all assignments in this course
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
  } catch {
    // silently degrade — submissions show as empty
  }

  // Fetch enrolled students for Students Info tab (ACTIVE only)
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: "asc" },
  });

  // Fetch pending enrollment requests
  const pendingEnrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { enrolledAt: "desc" },
  });

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

  // Fetch per-student activity stats for enriched Students Info
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
  // Material views — count distinct materials viewed per student
  let materialViews: { studentId: string; materialId: string }[] = [];
  try {
    materialViews = await prisma.materialView.findMany({
      where: { material: { courseId }, studentId: { in: studentIds } },
      select: { studentId: true, materialId: true },
    });
  } catch (err) {
    console.error("[StudentsInfo] materialView query failed:", err);
    /* degrade gracefully — materials column will show 0 */
  }

  const totalAssignments = course.assignments.length;
  const totalQuizzes = course.quizzes.length;
  const totalMaterials = course.readingMaterials.length;
  const totalActivities = totalAssignments + totalQuizzes + totalMaterials;

  const menuItems = [
    { label: 'Back to Workspace', ariaLabel: 'Go back to workspace', link: '/instructor' },
    { label: 'Curriculum Builder', ariaLabel: 'View modules', link: `?tab=modules` },
    { label: 'Reading Materials', ariaLabel: 'View materials', link: `?tab=reading` },
    { label: 'Assignments', ariaLabel: 'View assignments', link: `?tab=assignments` },
    { label: 'Quizzes & Tests', ariaLabel: 'View quizzes', link: `?tab=quizzes` },
    { label: 'Students Info', ariaLabel: 'View enrolled students', link: `?tab=students` },
  ];

  const socialItems = [
    { label: 'Admin Hub', link: '/admin' },
    { label: 'Support', link: '/support' }
  ];

  const seenLiveSessionTimes = new Set<number>();
  const duplicateLiveSessionCount = course.liveSessions.reduce((count, session) => {
    const key = session.scheduledAt.getTime();
    if (seenLiveSessionTimes.has(key)) {
      return count + 1;
    }
    seenLiveSessionTimes.add(key);
    return count;
  }, 0);

  return (
    <div className="container-page space-y-8">
      {/* Course Title Header */}
      <div className="flex items-center justify-between">
        <Link href="/instructor">
          <Button variant="ghost" className="text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 px-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Workspace
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-zinc-900">{course.title}</h1>
          <span className={`status-badge ${course.published ? 'status-badge--success' : 'status-badge--warning'}`}>
            {course.published ? 'PUBLISHED' : 'DRAFT'}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-6">
        
      <div className="flex justify-end gap-3 pb-6 border-b border-zinc-200">
        <Link href={`/student/courses/${course.id}`} target="_blank">
          <Button variant="outline" className="font-bold text-xs uppercase tracking-wider">Preview</Button>
        </Link>
        <form action={togglePublish}>
          <input type="hidden" name="courseId" value={course.id} />
          <input type="hidden" name="isPublished" value={course.published.toString()} />
          <Button type="submit" className={course.published ? "bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider" : "bg-zinc-900 text-white hover:bg-zinc-800 font-bold text-xs uppercase tracking-wider"}>
            {course.published ? "Unpublish" : "Publish"}
          </Button>
        </form>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
          
          {/* SIDEBAR */}
          <div className="space-y-4">
            <Link href={`/instructor/courses/${course.id}/roadmap`}>
              <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 shadow-lg shadow-indigo-500/20 mb-4 rounded-xl border border-indigo-400">
                <MapIcon className="w-5 h-5 mr-3" /> View Interactive Roadmap
              </Button>
            </Link>
            <div className="space-y-2">
              <Link href={`?tab=modules`}><Button variant={tab === "modules" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "modules" ? "bg-slate-200 text-slate-900 font-semibold" : "text-slate-600"}`}><LayoutList className="w-4 h-4 mr-2" /> Modules</Button></Link>
            <Link href={`?tab=reading`}><Button variant={tab === "reading" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "reading" ? "bg-slate-200 text-slate-900 font-semibold" : "text-slate-600"}`}><FileText className="w-4 h-4 mr-2" /> Reading Materials</Button></Link>
            <Link href={`?tab=assignments`}><Button variant={tab === "assignments" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "assignments" ? "bg-slate-200 text-slate-900 font-semibold" : "text-slate-600"}`}><CheckCircle className="w-4 h-4 mr-2" /> Assignments</Button></Link>
            <Link href={`?tab=quizzes`}><Button variant={tab === "quizzes" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "quizzes" ? "bg-slate-200 text-slate-900 font-semibold" : "text-slate-600"}`}><HelpCircle className="w-4 h-4 mr-2" /> Quizzes & Tests</Button></Link>

            <Link href={`?tab=students`}><Button variant={tab === "students" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "students" ? "bg-emerald-100 text-emerald-700 font-semibold" : "text-slate-600"}`}><Users className="w-4 h-4 mr-2" /> Students Info {pendingEnrollments.length > 0 && <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingEnrollments.length}</span>}</Button></Link>
            <Link href={`?tab=adminfeedback`}><Button variant={tab === "adminfeedback" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "adminfeedback" ? "bg-violet-100 text-violet-700 font-semibold" : "text-slate-600"}`}>
              <MessageSquare className="w-4 h-4 mr-2" /> Admin Feedback
            </Button></Link>
            </div>
          </div>

          <div className="md:col-span-3">
            
            {/* ROADMAP TAB IS REMOVED - standalone page now */}

            {/* MODULES TAB */}
            {tab === "modules" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutList className="w-6 h-6 text-slate-700" />
                  <h3 className="text-2xl font-bold text-slate-800">Course Modules</h3>
                  {duplicateLiveSessionCount > 0 && (
                    <form action={deleteDuplicateLiveSessions} className="ml-auto">
                      <input type="hidden" name="courseId" value={courseId} />
                      <Button type="submit" variant="outline" size="sm" className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700">
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete All Duplicates
                      </Button>
                    </form>
                  )}
                </div>
                {course.modules.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm">No modules yet.</div>
                ) : (
                  <div className="space-y-4">
                    {course.modules.map((mod, idx) => (
                      <Card key={mod.id} className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                          <CardTitle className="text-lg font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-800">
                              <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-xs">Module {idx + 1}</span>
                              {mod.title}
                            </span>
                            <form action={deleteModule}>
                              <input type="hidden" name="moduleId" value={mod.id} />
                              <input type="hidden" name="courseId" value={courseId} />
                              <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8">Delete Module</Button>
                            </form>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          {/* Lessons Section */}
                          <details className="group border border-slate-200 rounded-md bg-slate-50" open>
                            <summary className="font-semibold text-sm cursor-pointer p-3 outline-none hover:bg-slate-100 transition-colors list-none flex justify-between">
                              Lessons
                              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-3 pt-0 space-y-2 bg-white">
                              {mod.lessons.map(l => (
                                <div key={l.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                  <span className="text-slate-700">{l.title}</span>
                                </div>
                              ))}
                              {mod.lessons.length === 0 && <div className="text-xs text-slate-400">No lessons.</div>}
                              <div className="pt-2">
                                <form action={createLesson} className="flex gap-2">
                                  <input type="hidden" name="moduleId" value={mod.id} />
                                  <input type="hidden" name="courseId" value={courseId} />
                                  <Input name="title" placeholder="New lesson title..." className="h-8 text-sm" required />
                                  <Input name="videoUrl" placeholder="Video URL (optional)" className="h-8 text-sm" />
                                  <Button type="submit" size="sm" className="h-8 bg-slate-900 text-white">Add Lesson</Button>
                                </form>
                              </div>
                            </div>
                          </details>

                          {/* Live Classes Section */}
                          <details className="group border border-slate-200 rounded-md bg-slate-50">
                            <summary className="font-semibold text-sm cursor-pointer p-3 outline-none hover:bg-slate-100 transition-colors list-none flex justify-between">
                              Live Classes
                              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-3 pt-0 space-y-2 bg-white">
                              {mod.liveSessions.map(l => (
                                <div key={l.id} className="flex flex-col gap-2 text-sm border border-slate-200 p-3 rounded-md mb-2">
                                  <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">{l.title}</span>
                                      <span className="text-xs text-slate-500">{new Date(l.scheduledAt).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded ${l.status === "ONGOING" ? "bg-red-100 text-red-700" : l.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                        {l.status}
                                      </span>
                                      <form action={deleteLiveSession}>
                                        <input type="hidden" name="id" value={l.id} />
                                        <input type="hidden" name="courseId" value={courseId} />
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8">Delete</Button>
                                      </form>
                                    </div>
                                  </div>
                                  {l.status !== "COMPLETED" && (
                                    <div className="mt-2">
                                      <StartClassButton sessionId={l.id} roomId={l.roomId} />
                                    </div>
                                  )}
                                </div>
                              ))}
                              {mod.liveSessions.length === 0 && <div className="text-xs text-slate-400">No live classes scheduled.</div>}
                              <div className="pt-2 border-t border-slate-100 mt-2">
                                <LiveSessionScheduleForm
                                  courseId={courseId}
                                  moduleId={mod.id}
                                  createLiveSessionAction={createLiveSession}
                                />
                              </div>
                            </div>
                          </details>

                          {/* Recorded Videos Section */}
                          <details className="group border border-slate-200 rounded-md bg-slate-50">
                            <summary className="font-semibold text-sm cursor-pointer p-3 outline-none hover:bg-slate-100 transition-colors list-none flex justify-between">
                              Recorded Videos
                              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-3 pt-0 space-y-2 bg-white">
                              {mod.recordedClasses.map(l => (
                                <div key={l.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                  <span className="text-slate-700">{l.title}</span>
                                  <form action={deleteRecordedClass}>
                                    <input type="hidden" name="id" value={l.id} />
                                    <input type="hidden" name="courseId" value={courseId} />
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8">Delete</Button>
                                  </form>
                                </div>
                              ))}
                              {mod.recordedClasses.length === 0 && <div className="text-xs text-slate-400">No recorded videos.</div>}
                            </div>
                          </details>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <Card className="border-dashed border-2 p-6 bg-transparent">
                  <form action={createModule} className="flex gap-4 items-end">
                    <input type="hidden" name="courseId" value={courseId} />
                    <div className="flex-1 space-y-2"><Label>New Module</Label><Input name="title" required placeholder="Week 1..."/></div>
                    <Button type="submit" className="bg-slate-900 text-white">Create Module</Button>
                  </form>
                </Card>
              </div>
            )}

            {/* READING TAB — now uses local file upload via Cloudinary */}
            {tab === "reading" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">Reading Materials</h2>
                {/* ReadingMaterialUpload is a client component that:
                    - fetches the materials list via GET /api/reading-materials
                    - uploads files via POST /api/reading-materials/upload (XHR for real progress)
                    - deletes via DELETE /api/reading-materials (also cleans Cloudinary)
                    - shows analytics via the existing MaterialAnalyticsButton
                */}
                <ReadingMaterialUpload courseId={courseId} />
              </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {tab === "assignments" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">Course Assignments</h2>
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader><CardTitle className="text-lg">Create Assignment</CardTitle></CardHeader>
                  <CardContent>
                    <form action={createAssignment} className="space-y-4">
                      <input type="hidden" name="courseId" value={courseId} />
                      <div className="space-y-2"><Label>Title</Label><Input name="title" required placeholder="Final Project"/></div>
                      <div className="space-y-2"><Label>Description</Label><Textarea name="description" placeholder="Instructions..."/></div>
                      <div className="space-y-2"><Label>Problem Statement (Drive)</Label><Input name="driveLink" placeholder="https://drive..."/></div>
                      <div className="space-y-2">
                        <Label>Deadline <span className="text-slate-400 font-normal">(optional — defaults to 7 days)</span></Label>
                        <Input name="deadline" type="datetime-local" className="bg-white"/>
                      </div>
                      <Button type="submit" className="w-full bg-blue-600 text-white">Add Assignment</Button>
                    </form>
                  </CardContent>
                </Card>
                {course.assignments.map((asgn) => (
                  <Card key={asgn.id} className="p-0 bg-white border-slate-200 shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-amber-400" />
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg">{asgn.title}</h3>
                          {asgn.description && <p className="text-sm text-slate-500 mt-1">{asgn.description}</p>}
                          {asgn.driveLink && (
                            <a href={asgn.driveLink} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> View Problem Statement
                            </a>
                          )}
                        </div>
                        <form action={deleteResource} className="shrink-0">
                          <input type="hidden" name="id" value={asgn.id} />
                          <input type="hidden" name="type" value="assignment" />
                          <input type="hidden" name="courseId" value={courseId} />
                          <Button type="submit" variant="ghost" className="text-red-500"><Trash2 className="w-4 h-4"/></Button>
                        </form>
                      </div>

                      {/* Submissions panel */}
                      <SubmissionsPanel
                        assignmentId={asgn.id}
                        assignmentTitle={asgn.title}
                        initialSubmissions={(submissionsMap.get(asgn.id) ?? []).map((s: any) => ({
                          id: s.id,
                          studentId: s.studentId,
                          driveLink: s.driveLink,
                          // New normalized file relation
                          fileId: (s as unknown as { fileId?: string | null }).fileId ?? null,
                          file:   (s as unknown as { file?: unknown }).file as never ?? null,
                          // Legacy fallback fields
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
                {course.assignments.length === 0 && <p className="text-center py-12 text-slate-400">No assignments created yet.</p>}
              </div>
            )}

            {/* QUIZZES TAB */}
            {tab === "quizzes" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Quiz Management</h2>
                  <form action={createQuiz} className="flex gap-2">
                    <input type="hidden" name="courseId" value={courseId} />
                    <Input name="title" required placeholder="Quiz Name..." className="w-64 bg-white" />
                    <Button type="submit" size="sm" className="bg-blue-600">Create Quiz</Button>
                  </form>
                </div>

                {course.quizzes.map((quiz) => (
                  <Card key={quiz.id} className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b flex flex-row justify-between items-center py-4">
                      <div>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>{quiz.questions.length} Questions total</CardDescription>
                      </div>
                      <form action={deleteQuiz}>
                        <input type="hidden" name="id" value={quiz.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <Button type="submit" variant="ghost" size="sm" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </form>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      
                      {/* List Questions */}
                      <div className="space-y-4">
                        {quiz.questions.map((q, qIdx) => (
                          <div key={q.id} className="p-4 border rounded-md bg-white relative group">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">
                                  {q.type === "MCQ" ? "Single Choice" : q.type === "MULTIPLE" ? "Multiple Choice" : q.type}
                                </span>
                                <span className="ml-2 text-xs text-slate-400">1 Mark</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <form action={deleteQuestion}>
                                  <input type="hidden" name="id" value={q.id} />
                                  <input type="hidden" name="courseId" value={courseId} />
                                  <Button type="submit" variant="ghost" size="sm" className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </form>
                              </div>
                            </div>
                            <p className="font-medium mt-1">{qIdx + 1}. {q.text}</p>
                            {q.type === "MCQ" && (
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className={`flex items-center gap-2 text-sm p-2 rounded border ${q.correctOption === oIdx ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <input type="radio" checked={q.correctOption === oIdx} readOnly className="accent-green-600" />
                                    <span>{opt}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Question Form */}
                      <div className="pt-6 border-t border-slate-100">
                        <p className="text-sm font-bold mb-4">Add New Question</p>
                        <form action={addQuestion} className="space-y-4">
                          <input type="hidden" name="quizId" value={quiz.id} />
                          <input type="hidden" name="courseId" value={courseId} />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Question Type</Label>
                              <select name="type" defaultValue="MCQ" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                                <option value="MCQ">Single Choice</option>
                                <option value="ESSAY">Essay (Manual)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Question Text</Label>
                              <Input name="text" required placeholder="What is the capital of..." />
                            </div>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-md space-y-3">
                            <Label className="text-xs font-bold text-slate-600">Answer Options</Label>
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="correctOption"
                                  value={i}
                                  defaultChecked={i === 0}
                                  className="accent-zinc-900 shrink-0"
                                />
                                <Input
                                  name={`opt${i}`}
                                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                  className="bg-white"
                                />
                              </div>
                            ))}
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                              Select the radio button next to the correct answer
                            </p>
                          </div>
                          
                          <Button type="submit" variant="outline" className="w-full">
                            <HelpCircle className="w-4 h-4 mr-2" /> Save Question to Quiz
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {course.quizzes.length === 0 && <p className="text-center py-12 text-slate-400">No quizzes created yet.</p>}
              </div>
            )}



            {/* STUDENTS INFO TAB */}
            {tab === "students" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-6 h-6 text-emerald-600" />
                    <h2 className="text-xl font-bold">Students Info</h2>
                  </div>
                  <span className="text-sm font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                    {enrollments.length} enrolled
                  </span>
                </div>

                {/* ── Pending Enrollment Requests Section ── */}
                {pendingEnrollments.length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-b border-amber-100">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-800">Pending Requests</h3>
                      <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {pendingEnrollments.length} waiting
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="space-y-2">
                        {pendingEnrollments.map((enr) => (
                          <div key={enr.id} className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-amber-700">
                                {(enr.user.name ?? enr.user.email)[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800">{enr.user.name ?? "—"}</p>
                              <p className="text-xs text-slate-400">{enr.user.email}</p>
                              <p className="text-xs text-amber-600 mt-0.5">
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
                                // Send notification to student
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
                                  className="text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-md transition-colors"
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
                                // Send notification to student
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
                                  className="text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-md transition-colors"
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

                {/* ── Add Students Section ── */}
                {unenrolledMembers.length > 0 && (
                  <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-emerald-800">Add Students</h3>
                      <span className="ml-auto text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        {unenrolledMembers.length} available
                      </span>
                    </div>
                    <div className="p-3 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unenrolledMembers.map((m) => (
                          <form key={m.id} action={enrollStudent} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors">
                            <input type="hidden" name="courseId" value={courseId} />
                            <input type="hidden" name="studentId" value={m.user.id} />
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-slate-600">
                                {(m.user.name ?? m.user.email)[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">{m.user.name ?? "—"}</p>
                              <p className="text-[10px] text-slate-400 truncate">{m.user.email}</p>
                            </div>
                            <button type="submit" className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md transition-colors shrink-0 cursor-pointer">
                              + Enroll
                            </button>
                          </form>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {enrollments.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-lg font-semibold text-slate-500">No students enrolled yet.</p>
                    <p className="text-sm mt-1">Students will appear here once they enrol in this course.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-5 py-3 font-semibold text-slate-600">#</th>
                          <th className="text-left px-5 py-3 font-semibold text-slate-600">Student</th>
                          <th className="text-left px-5 py-3 font-semibold text-slate-600">Email</th>
                          <th className="text-center px-5 py-3 font-semibold text-slate-600">Assignments</th>
                          <th className="text-center px-5 py-3 font-semibold text-slate-600">Quizzes</th>
                          <th className="text-center px-5 py-3 font-semibold text-slate-600">Materials</th>
                          <th className="text-left px-5 py-3 font-semibold text-slate-600">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
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
                            <tr key={enr.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-emerald-700">
                                      {(enr.user.name ?? enr.user.email)[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-medium text-slate-800">{enr.user.name ?? "—"}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-slate-500 text-xs">{enr.user.email}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  asgDone === totalAssignments && totalAssignments > 0
                                    ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                }`}>{asgDone}/{totalAssignments}</span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  qzDone === totalQuizzes && totalQuizzes > 0
                                    ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                }`}>{qzDone}/{totalQuizzes}</span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  matDone === totalMaterials && totalMaterials > 0
                                    ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                }`}>{matDone}/{totalMaterials}</span>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-2 bg-emerald-500 rounded-full transition-all"
                                      style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-600 font-bold w-8">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ADMIN FEEDBACK TAB — client component fetches live data */}
            {tab === "adminfeedback" && (
              <InstructorFeedbackTab courseId={courseId} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
