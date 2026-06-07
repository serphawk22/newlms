import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, BookOpen, FileText, CheckCircle, LayoutList,
  Trash2, HelpCircle, ExternalLink, Users, MessageSquare,
  MapIcon, PlayCircle, Shield, Activity, Calendar, Clock,
  Settings, Eye, EyeOff
} from "lucide-react";
import { getAdminContext } from "../../_lib";
import { notifyEnrolledStudents, createEvent } from "@/lib/notifications";
import { SubmissionsPanel } from "@/components/SubmissionsPanel";
import { ReadingMaterialUpload } from "@/components/ReadingMaterialUpload";
import { CourseCommentsTab } from "@/components/CourseCommentsTab";
import { InstructorFeedbackTab } from "@/components/admin/InstructorFeedbackTab";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { logCourseActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// --- SERVER ACTIONS ---

async function adminCreateModule(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const courseId = formData.get("courseId") as string;
  if (title && courseId) {
    await prisma.module.create({ data: { title, courseId } });
    const { triggerCourseUpdateNotifications } = await import("@/lib/email-notifications-helper");
    triggerCourseUpdateNotifications(courseId, "MODULE", title).catch((err) =>
      console.error("[adminCreateModule notification error]", err)
    );
    await logCourseActivity(courseId, `Module "${title}" added by Admin`);
    revalidatePath(`/admin/all-courses/${courseId}`);
  }
}

async function adminDeleteModule(formData: FormData) {
  "use server";
  const moduleId = formData.get("moduleId") as string;
  const courseId = formData.get("courseId") as string;
  if (!moduleId) return;
  await prisma.lesson.deleteMany({ where: { moduleId } });
  await prisma.liveSession.deleteMany({ where: { moduleId } });
  await prisma.recordedClass.deleteMany({ where: { moduleId } });
  await prisma.module.delete({ where: { id: moduleId } });
  await logCourseActivity(courseId, `Module deleted by Admin`);
  revalidatePath(`/admin/all-courses/${courseId}`);
}

async function adminCreateLesson(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const moduleId = formData.get("moduleId") as string;
  const courseId = formData.get("courseId") as string;
  const videoUrl = formData.get("videoUrl") as string;
  if (title && moduleId) {
    await prisma.lesson.create({ data: { title, moduleId, videoUrl: videoUrl || null } });
    const { triggerCourseUpdateNotifications } = await import("@/lib/email-notifications-helper");
    triggerCourseUpdateNotifications(courseId, "LESSON", title).catch((err) =>
      console.error("[adminCreateLesson notification error]", err)
    );
    await logCourseActivity(courseId, `Lesson "${title}" added by Admin`);
    revalidatePath(`/admin/all-courses/${courseId}`);
  }
}

async function adminCreateAssignment(formData: FormData) {
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
      console.error("[adminCreateAssignment notification error]", err)
    );
    const deadlineDate = deadlineRaw ? new Date(deadlineRaw) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createEvent({ title: `Assignment Due: ${title}`, date: deadlineDate, type: "ASSIGNMENT_DEADLINE", courseId });
    await logCourseActivity(courseId, `Assignment "${title}" created by Admin`);
    revalidatePath(`/admin/all-courses/${courseId}`);
  }
}

async function adminDeleteResource(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const type = formData.get("type") as string;
  const courseId = formData.get("courseId") as string;
  if (type === "assignment") {
    await prisma.assignment.delete({ where: { id } });
    await logCourseActivity(courseId, `Assignment deleted by Admin`);
  }
  revalidatePath(`/admin/all-courses/${courseId}`);
}

async function adminTogglePublish(formData: FormData) {
  "use server";
  const courseId = formData.get("courseId") as string;
  const isPublished = formData.get("isPublished") === "true";
  const course = await prisma.course.update({
    where: { id: courseId },
    data: { published: !isPublished },
    select: { title: true },
  });
  if (!isPublished) {
    await createEvent({ title: `Course Published: ${course.title}`, date: new Date(), type: "COURSE_PUBLISHED", courseId });
    await notifyEnrolledStudents({
      courseId,
      message: `"${course.title}" is now live! Start learning today.`,
      type: "COURSE",
      link: `/student/courses/${courseId}`,
    });
  }
  await logCourseActivity(courseId, `Course ${!isPublished ? "published" : "unpublished"} by Admin`);
  revalidatePath(`/admin/all-courses/${courseId}`);
  revalidatePath(`/admin/all-courses`);
}

async function adminCreateQuiz(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const courseId = formData.get("courseId") as string;
  if (title && courseId) {
    const quiz = await prisma.quiz.create({ data: { title, courseId } });
    const { triggerQuizCreatedNotifications } = await import("@/lib/email-notifications-helper");
    triggerQuizCreatedNotifications(quiz.id).catch((err) =>
      console.error("[adminCreateQuiz notification error]", err)
    );
    await logCourseActivity(courseId, `Quiz "${title}" created by Admin`);
    revalidatePath(`/admin/all-courses/${courseId}`);
  }
}

async function adminDeleteQuiz(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const courseId = formData.get("courseId") as string;
  try {
    await prisma.$transaction([
      prisma.quizSubmission.deleteMany({ where: { quizId: id } }),
      prisma.question.deleteMany({ where: { quizId: id } }),
      prisma.quiz.delete({ where: { id } }),
    ]);
    await logCourseActivity(courseId, `Quiz deleted by Admin`);
  } catch (error) {
    console.error("Error deleting quiz:", error);
  }
  revalidatePath(`/admin/all-courses/${courseId}`);
}

async function adminAddQuestion(formData: FormData) {
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
    await prisma.question.create({ data: { quizId, type, text, options, correctOption, points: 1 } });
  } else {
    await prisma.question.create({ data: { quizId, type, text, points: 1 } });
  }
  revalidatePath(`/admin/all-courses/${courseId}`);
}

async function adminDeleteQuestion(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const courseId = formData.get("courseId") as string;
  await prisma.question.delete({ where: { id } });
  revalidatePath(`/admin/all-courses/${courseId}`);
}

async function adminDeleteRecordedClass(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const courseId = formData.get("courseId") as string;
  await prisma.recordedClass.delete({ where: { id } });
  await logCourseActivity(courseId, `Recorded class deleted by Admin`);
  revalidatePath(`/admin/all-courses/${courseId}`);
}

// --- PAGE COMPONENT ---

export default async function AdminCourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await getAdminContext(); // ensures admin auth
  const { courseId } = await params;
  const { tab = "overview" } = await searchParams;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      creator: { select: { name: true, email: true } },
      modules: {
        orderBy: { id: "asc" },
        include: {
          lessons: { orderBy: { id: "asc" } },
          liveSessions: { orderBy: { createdAt: "desc" } },
          recordedClasses: { orderBy: { createdAt: "desc" } },
        },
      },
      assignments: { orderBy: { createdAt: "desc" } },
      readingMaterials: { orderBy: { createdAt: "desc" } },
      quizzes: { include: { questions: true } },
      liveSessions: { orderBy: { createdAt: "desc" } },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) notFound();

  // Fetch course activities safely to bypass stale Prisma client typings
  let courseActivities: any[] = [];
  try {
    courseActivities = await prisma.$queryRaw`
      SELECT id, action, timestamp 
      FROM "CourseActivity" 
      WHERE "courseId" = ${courseId} 
      ORDER BY "timestamp" DESC 
      LIMIT 50
    `;
  } catch (err) {
    // Table might not exist yet if db push wasn't run
  }

  // Fetch submissions for all assignments
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
      include: { student: { select: { id: true, name: true, email: true } }, file: true },
      orderBy: { submittedAt: "desc" },
    }) as SubmissionWithStudent[];
    for (const s of allSubs) {
      if (!submissionsMap.has(s.assignmentId)) submissionsMap.set(s.assignmentId, []);
      submissionsMap.get(s.assignmentId)!.push(s);
    }
  } catch { /* degrade gracefully */ }

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: "asc" },
  });

  const tabs = [
    { key: "overview", label: "Overview", icon: Eye },
    { key: "modules", label: "Modules", icon: LayoutList },
    { key: "reading", label: "Resources", icon: FileText },
    { key: "assignments", label: "Assignments", icon: CheckCircle },
    { key: "quizzes", label: "Quizzes", icon: HelpCircle },
    { key: "students", label: "Students", icon: Users },
    { key: "comments", label: "Q&A", icon: MessageSquare },
    { key: "adminfeedback", label: "Feedback", icon: MessageSquare },
    { key: "activity", label: "Activity Log", icon: Activity },
  ];

  const createdAtStr = course.createdAt ? new Date(course.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
  const updatedAtStr = course.updatedAt ? new Date(course.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";

  return (
    <div className="container-page space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/all-courses">
          <Button variant="ghost" className="text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)] px-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> All Courses
          </Button>
        </Link>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#D9252A]" />
            <span className="text-xs font-semibold text-[#D9252A] bg-[rgba(217,37,42,0.08)] border border-[rgba(217,37,42,0.15)] px-2 py-1 rounded-full">Admin Edit Access</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
            course.published ? "bg-[rgba(217,37,42,0.08)] text-[#D9252A]" : "bg-[rgba(217,37,42,0.08)] text-[#D9252A]"
          }`}>
            {course.published ? "Published" : "Draft"}
          </span>
          <form action={adminTogglePublish}>
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="isPublished" value={course.published.toString()} />
            <Button type="submit" size="sm" className={course.published
              ? "bg-[#D9252A] hover:bg-[#C21F24] text-white font-bold text-xs uppercase tracking-wider"
              : "bg-[#D9252A] hover:bg-[#C21F24] text-white font-bold text-xs uppercase tracking-wider"
            }>
              {course.published ? <><EyeOff className="w-3.5 h-3.5 mr-1.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5 mr-1.5" /> Publish</>}
            </Button>
          </form>
        </div>
      </div>

      {/* Course Info */}
      <Card className="border-[var(--border)] shadow-sm bg-[var(--card)]">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">{course.title}</h1>
              {course.description && <p className="text-sm text-[var(--muted-foreground)] mt-1 leading-relaxed">{course.description}</p>}
              <div className="flex flex-wrap gap-6 mt-4 text-xs text-[var(--muted-foreground)]">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  <span>By <strong className="text-[var(--foreground)]">{course.creator?.name || course.creator?.email || "Unknown"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  <span><strong className="text-[var(--foreground)]">{course._count.enrollments}</strong> enrolled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  <span>Created <strong className="text-[var(--foreground)]">{createdAtStr}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  <span>Updated <strong className="text-[var(--foreground)]">{updatedAtStr}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <LayoutList className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  <span><strong className="text-[var(--foreground)]">{course.modules.length}</strong> modules</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                  <span><strong className="text-[var(--foreground)]">{course.quizzes.length}</strong> quizzes</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="space-y-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <Link key={key} href={`?tab=${key}`}>
              <Button
                variant={tab === key ? "secondary" : "ghost"}
                className={`w-full justify-start text-sm ${tab === key ? "bg-[rgba(217,37,42,0.08)] text-[#D9252A] font-semibold" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)]"}`}
              >
                <Icon className="w-4 h-4 mr-2 shrink-0" />
                {label}
              </Button>
            </Link>
          ))}

          <div className="pt-4 border-t border-[var(--border)]">
            <Link href={`/admin/all-courses/${courseId}/roadmap`}>
              <Button className="w-full justify-start bg-[#D9252A] hover:bg-[#C21F24] text-white font-bold rounded-xl py-5 mt-1">
                <MapIcon className="w-4 h-4 mr-2" /> View Roadmap
              </Button>
            </Link>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Course Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Modules", value: course.modules.length, color: "bg-[rgba(217,37,42,0.08)] text-[#D9252A]", icon: LayoutList },
                  { label: "Lessons", value: course.modules.reduce((sum, m) => sum + m.lessons.length, 0), color: "bg-[rgba(217,37,42,0.08)] text-[#D9252A]", icon: BookOpen },
                  { label: "Assignments", value: course.assignments.length, color: "bg-[rgba(217,37,42,0.08)] text-[#D9252A]", icon: CheckCircle },
                  { label: "Quizzes", value: course.quizzes.length, color: "bg-[rgba(217,37,42,0.08)] text-[#D9252A]", icon: HelpCircle },
                  { label: "Resources", value: course.readingMaterials.length, color: "bg-[rgba(217,37,42,0.08)] text-[#D9252A]", icon: FileText },
                  { label: "Enrolled", value: course._count.enrollments, color: "bg-[rgba(217,37,42,0.08)] text-[#D9252A]", icon: Users },
                ].map(({ label, value, color, icon: Icon }) => (
                  <Card key={label} className="border-[var(--border)] shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-[var(--foreground)]">{value}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Course Details Edit Form */}
              <Card className="border-[var(--border)] shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="w-4 h-4 text-[#D9252A]" />
                    Course Settings
                  </CardTitle>
                  <CardDescription>Admin can edit course title and description</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={async (formData: FormData) => {
                    "use server";
                    const title = formData.get("title") as string;
                    const description = formData.get("description") as string;
                    const cId = formData.get("courseId") as string;
                    if (title && cId) {
                      await prisma.course.update({ where: { id: cId }, data: { title, description } });
                      await logCourseActivity(cId, `Course details updated by Admin`);
                      revalidatePath(`/admin/all-courses/${cId}`);
                      revalidatePath(`/admin/all-courses`);
                    }
                  }} className="space-y-4">
                    <input type="hidden" name="courseId" value={course.id} />
                    <div className="space-y-2">
                      <Label>Course Title</Label>
                      <Input name="title" defaultValue={course.title} required className="bg-[var(--card)] border-[var(--border)]" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea name="description" defaultValue={course.description || ""} rows={4} placeholder="Course description..." className="bg-[var(--card)] border-[var(--border)] resize-none" />
                    </div>
                    <Button type="submit" className="bg-[#D9252A] hover:bg-[#C21F24] text-white font-semibold">Save Changes</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MODULES TAB */}
          {tab === "modules" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-[var(--foreground)]" />
                <h3 className="text-xl font-bold text-[var(--foreground)]">Course Modules</h3>
              </div>
              {course.modules.length === 0 ? (
                <div className="text-center py-16 text-[var(--muted-foreground)] bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-sm">No modules yet.</div>
              ) : (
                <div className="space-y-4">
                  {course.modules.map((mod, idx) => (
                    <Card key={mod.id} className="border-[var(--border)] shadow-sm">
                      <CardHeader className="bg-[var(--secondary-background)] border-b border-[var(--border)] pb-3">
                        <CardTitle className="text-lg font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2 text-[var(--foreground)]">
                            <span className="bg-[var(--secondary-background)] text-[var(--foreground)] px-2 py-0.5 rounded text-xs">Module {idx + 1}</span>
                            {mod.title}
                          </span>
                          <form action={adminDeleteModule}>
                            <input type="hidden" name="moduleId" value={mod.id} />
                            <input type="hidden" name="courseId" value={courseId} />
                            <Button type="submit" variant="ghost" size="sm" className="text-[#D9252A] hover:bg-[rgba(217,37,42,0.08)] hover:text-[#C21F24] h-8">Delete Module</Button>
                          </form>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {/* Lessons */}
                        <details className="group border border-[var(--border)] rounded-md bg-[var(--secondary-background)]" open>
                          <summary className="font-semibold text-sm cursor-pointer p-3 outline-none hover:bg-[var(--secondary-background)] transition-colors list-none flex justify-between">
                            Lessons <span className="text-[var(--muted-foreground)] group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="p-3 pt-0 space-y-2 bg-[var(--card)]">
                            {mod.lessons.map(l => (
                              <div key={l.id} className="flex items-center justify-between text-sm border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                                <span className="text-[var(--foreground)]">{l.title}</span>
                                {l.videoUrl && (
                                  <a href={l.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#D9252A] hover:underline flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> Video
                                  </a>
                                )}
                              </div>
                            ))}
                            {mod.lessons.length === 0 && <div className="text-xs text-[var(--muted-foreground)]">No lessons yet.</div>}
                            <div className="pt-2">
                              <form action={adminCreateLesson} className="flex gap-2">
                                <input type="hidden" name="moduleId" value={mod.id} />
                                <input type="hidden" name="courseId" value={courseId} />
                                <Input name="title" placeholder="New lesson title..." className="h-8 text-sm" required />
                                <Input name="videoUrl" placeholder="Video URL (optional)" className="h-8 text-sm" />
                                <Button type="submit" size="sm" className="h-8 bg-[#D9252A] text-white shrink-0">Add Lesson</Button>
                              </form>
                            </div>
                          </div>
                        </details>

                        {/* Recorded Videos */}
                        {mod.recordedClasses.length > 0 && (
                          <details className="group border border-[var(--border)] rounded-md bg-[var(--secondary-background)]">
                            <summary className="font-semibold text-sm cursor-pointer p-3 outline-none hover:bg-[var(--secondary-background)] transition-colors list-none flex justify-between">
                              Recorded Videos ({mod.recordedClasses.length}) <span className="text-[var(--muted-foreground)] group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-3 pt-0 space-y-2 bg-[var(--card)]">
                              {mod.recordedClasses.map(l => (
                                <div key={l.id} className="flex items-center justify-between text-sm border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                                  <VideoPlayerModal videoUrl={l.videoUrl} title={l.title} duration={l.duration}>
                                    <span className="flex items-center gap-2 text-[var(--foreground)] hover:text-[#D9252A] transition-colors cursor-pointer">
                                      <PlayCircle className="w-4 h-4 text-[#D9252A]" /> {l.title}
                                    </span>
                                  </VideoPlayerModal>
                                  <form action={adminDeleteRecordedClass}>
                                    <input type="hidden" name="id" value={l.id} />
                                    <input type="hidden" name="courseId" value={courseId} />
                                    <Button variant="ghost" size="sm" className="text-[#D9252A] hover:bg-[rgba(217,37,42,0.08)] hover:text-[#C21F24] h-7 text-xs">Delete</Button>
                                  </form>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <Card className="border-dashed border-2 p-6 bg-transparent">
                <form action={adminCreateModule} className="flex gap-4 items-end">
                  <input type="hidden" name="courseId" value={courseId} />
                  <div className="flex-1 space-y-2">
                    <Label>New Module</Label>
                    <Input name="title" required placeholder="Module title..." />
                  </div>
                  <Button type="submit" className="bg-[#D9252A] text-white">Create Module</Button>
                </form>
              </Card>
            </div>
          )}

          {/* READING MATERIALS TAB */}
          {tab === "reading" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Reading Materials & Resources</h2>
              <ReadingMaterialUpload courseId={courseId} />
            </div>
          )}

          {/* ASSIGNMENTS TAB */}
          {tab === "assignments" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Course Assignments</h2>
              <Card className="border-[var(--border)] shadow-sm">
                <CardHeader><CardTitle className="text-lg">Create Assignment</CardTitle></CardHeader>
                <CardContent>
                  <form action={adminCreateAssignment} className="space-y-4">
                    <input type="hidden" name="courseId" value={courseId} />
                    <div className="space-y-2"><Label>Title</Label><Input name="title" required placeholder="Assignment title..." /></div>
                    <div className="space-y-2"><Label>Description</Label><Textarea name="description" placeholder="Instructions..." /></div>
                    <div className="space-y-2"><Label>Problem Statement (Drive link)</Label><Input name="driveLink" placeholder="https://drive.google.com/..." /></div>
                    <div className="space-y-2">
                      <Label>Deadline <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
                      <Input name="deadline" type="datetime-local" className="bg-[var(--card)]" />
                    </div>
                    <Button type="submit" className="w-full bg-[#D9252A] text-white">Add Assignment</Button>
                  </form>
                </CardContent>
              </Card>
              {course.assignments.map((asgn) => (
                <Card key={asgn.id} className="p-0 bg-[var(--card)] border-[var(--border)] shadow-sm overflow-hidden">
                  <div className="h-1 w-full bg-[#D9252A]" />
                  <div className="p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg">{asgn.title}</h3>
                        {asgn.description && <p className="text-sm text-[var(--muted-foreground)] mt-1">{asgn.description}</p>}
                        {asgn.driveLink && (
                          <a href={asgn.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#D9252A] hover:underline mt-1 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> View Problem Statement
                          </a>
                        )}
                      </div>
                      <form action={adminDeleteResource} className="shrink-0">
                        <input type="hidden" name="id" value={asgn.id} />
                        <input type="hidden" name="type" value="assignment" />
                        <input type="hidden" name="courseId" value={courseId} />
                        <Button type="submit" variant="ghost" className="text-[#D9252A]"><Trash2 className="w-4 h-4" /></Button>
                      </form>
                    </div>
                    <SubmissionsPanel
                      assignmentId={asgn.id}
                      assignmentTitle={asgn.title}
                      initialSubmissions={(submissionsMap.get(asgn.id) ?? []).map((s: any) => ({
                        id: s.id,
                        studentId: s.studentId,
                        driveLink: s.driveLink,
                        fileId: (s as any).fileId ?? null,
                        file: (s as any).file ?? null,
                        fileUrl: s.fileUrl ?? null,
                        fileType: s.fileType ?? null,
                        mimeType: s.mimeType ?? null,
                        fileSize: s.fileSize ?? null,
                        originalFileName: s.originalFileName ?? null,
                        grade: s.grade,
                        maxGrade: s.maxGrade,
                        feedback: s.feedback ?? null,
                        submittedAt: s.submittedAt.toISOString(),
                        gradedAt: s.gradedAt?.toISOString() ?? null,
                        student: s.student,
                      }))}
                    />
                  </div>
                </Card>
              ))}
              {course.assignments.length === 0 && <p className="text-center py-12 text-[var(--muted-foreground)]">No assignments created yet.</p>}
            </div>
          )}

          {/* QUIZZES TAB */}
          {tab === "quizzes" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Quiz Management</h2>
                <form action={adminCreateQuiz} className="flex gap-2">
                  <input type="hidden" name="courseId" value={courseId} />
                  <Input name="title" required placeholder="Quiz Name..." className="w-64 bg-[var(--card)]" />
                  <Button type="submit" size="sm" className="bg-[#D9252A]">Create Quiz</Button>
                </form>
              </div>
              {course.quizzes.map((quiz) => (
                <Card key={quiz.id} className="border-[var(--border)] shadow-sm overflow-hidden">
                  <CardHeader className="bg-[var(--secondary-background)] border-b flex flex-row justify-between items-center py-4">
                    <div>
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <CardDescription>{quiz.questions.length} Questions total</CardDescription>
                    </div>
                    <form action={adminDeleteQuiz}>
                      <input type="hidden" name="id" value={quiz.id} />
                      <input type="hidden" name="courseId" value={courseId} />
                      <Button type="submit" variant="ghost" size="sm" className="text-[#D9252A]"><Trash2 className="w-4 h-4" /></Button>
                    </form>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      {quiz.questions.map((q, qIdx) => (
                        <div key={q.id} className="p-4 border rounded-md bg-[var(--card)] relative group">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold uppercase text-[#D9252A] tracking-wider">{q.type}</span>
                            <form action={adminDeleteQuestion}>
                              <input type="hidden" name="id" value={q.id} />
                              <input type="hidden" name="courseId" value={courseId} />
                              <Button type="submit" variant="ghost" size="sm" className="text-[#D9252A] hover:text-[#C21F24] opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </form>
                          </div>
                          <p className="font-medium mt-1">{qIdx + 1}. {q.text}</p>
                          {q.type === "MCQ" && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className={`flex items-center gap-2 text-sm p-2 rounded border ${q.correctOption === oIdx ? "bg-green-50 border-green-200 text-green-700" : "bg-[var(--secondary-background)] border-[var(--border)]"}`}>
                                  <input type="radio" checked={q.correctOption === oIdx} readOnly className="accent-green-600" />
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="pt-6 border-t border-[var(--border)]">
                      <p className="text-sm font-bold mb-4">Add New Question</p>
                      <form action={adminAddQuestion} className="space-y-4">
                        <input type="hidden" name="quizId" value={quiz.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Question Type</Label>
                            <select name="type" defaultValue="MCQ" className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
                              <option value="MCQ">Single Choice</option>
                              <option value="ESSAY">Essay (Manual)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Input name="text" required placeholder="Question text..." />
                          </div>
                        </div>
                        <div className="bg-[var(--secondary-background)] p-4 rounded-md space-y-3">
                          <Label className="text-xs font-bold text-[var(--muted-foreground)]">Answer Options</Label>
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                              <input type="radio" name="correctOption" value={i} defaultChecked={i === 0} className="accent-[#D9252A] shrink-0" />
                              <Input name={`opt${i}`} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="bg-[var(--card)]" />
                            </div>
                          ))}
                        </div>
                        <Button type="submit" variant="outline" className="w-full">
                          <HelpCircle className="w-4 h-4 mr-2" /> Save Question to Quiz
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {course.quizzes.length === 0 && <p className="text-center py-12 text-[var(--muted-foreground)]">No quizzes created yet.</p>}
            </div>
          )}

          {/* STUDENTS TAB */}
          {tab === "students" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#D9252A]" />
                  <h2 className="text-xl font-bold">Enrolled Students</h2>
                </div>
                <span className="text-sm font-semibold bg-[rgba(217,37,42,0.08)] text-[#D9252A] px-3 py-1 rounded-full">
                  {enrollments.length} enrolled
                </span>
              </div>
              {enrollments.length === 0 ? (
                <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm text-[var(--muted-foreground)]">
                  <Users className="w-12 h-12 mx-auto mb-3 text-[var(--muted-foreground)]" />
                  <p className="text-lg font-semibold text-[var(--muted-foreground)]">No students enrolled yet.</p>
                </div>
              ) : (
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-[var(--secondary-background)] border-b border-[var(--border)]">
                        <th className="text-left px-5 py-3 font-semibold text-[var(--muted-foreground)]">#</th>
                        <th className="text-left px-5 py-3 font-semibold text-[var(--muted-foreground)]">Student</th>
                        <th className="text-left px-5 py-3 font-semibold text-[var(--muted-foreground)]">Email</th>
                        <th className="text-left px-5 py-3 font-semibold text-[var(--muted-foreground)]">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {enrollments.map((enr, idx) => (
                        <tr key={enr.id} className="hover:bg-[var(--secondary-background)] transition-colors">
                          <td className="px-5 py-3 text-[var(--muted-foreground)] font-mono text-xs">{idx + 1}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[rgba(217,37,42,0.08)] flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-[#D9252A]">
                                  {(enr.user.name ?? enr.user.email)[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-[var(--foreground)]">{enr.user.name ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[var(--muted-foreground)] text-xs">{enr.user.email}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-[var(--secondary-background)] rounded-full overflow-hidden">
                                <div className="h-2 bg-[#D9252A] rounded-full" style={{ width: `${Math.round(enr.progress * 100)}%` }} />
                              </div>
                              <span className="text-xs text-[var(--muted-foreground)] font-bold">{Math.round(enr.progress * 100)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Q&A TAB */}
          {tab === "comments" && <CourseCommentsTab courseId={courseId} />}

          {/* ADMIN FEEDBACK TAB */}
          {tab === "adminfeedback" && <InstructorFeedbackTab courseId={courseId} />}

          {/* ACTIVITY LOG TAB */}
          {tab === "activity" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#D9252A]" />
                <h2 className="text-xl font-bold">Course Activity Log</h2>
              </div>
              {courseActivities.length === 0 ? (
                <div className="text-center py-16 text-[var(--muted-foreground)] bg-[var(--card)] rounded-xl border border-[var(--border)]">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
                  <p>No activity recorded yet.</p>
                </div>
              ) : (
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
                  {courseActivities.map((act, i) => (
                    <div key={act.id} className={`flex items-start gap-4 px-5 py-3.5 ${i < courseActivities.length - 1 ? "border-b border-[var(--border)]" : ""} hover:bg-[var(--secondary-background)]/50 transition-colors`}>
                      <div className="w-8 h-8 rounded-full bg-[rgba(217,37,42,0.08)] border border-[rgba(217,37,42,0.15)] flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-[#D9252A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">{act.action}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {new Date(act.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
