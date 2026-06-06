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
    await prisma.assignment.create({ data: { title, description, driveLink, courseId } });
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
    await prisma.quiz.create({ data: { title, courseId } });
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
          <Button variant="ghost" className="text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 px-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> All Courses
          </Button>
        </Link>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-full">Admin Edit Access</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
            course.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}>
            {course.published ? "Published" : "Draft"}
          </span>
          <form action={adminTogglePublish}>
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="isPublished" value={course.published.toString()} />
            <Button type="submit" size="sm" className={course.published
              ? "bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider"
              : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider"
            }>
              {course.published ? <><EyeOff className="w-3.5 h-3.5 mr-1.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5 mr-1.5" /> Publish</>}
            </Button>
          </form>
        </div>
      </div>

      {/* Course Info */}
      <Card className="border-zinc-200 shadow-sm bg-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-zinc-900">{course.title}</h1>
              {course.description && <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{course.description}</p>}
              <div className="flex flex-wrap gap-6 mt-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>By <strong className="text-zinc-700">{course.creator?.name || course.creator?.email || "Unknown"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span><strong className="text-zinc-700">{course._count.enrollments}</strong> enrolled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Created <strong className="text-zinc-700">{createdAtStr}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Updated <strong className="text-zinc-700">{updatedAtStr}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <LayoutList className="w-3.5 h-3.5 text-zinc-400" />
                  <span><strong className="text-zinc-700">{course.modules.length}</strong> modules</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span><strong className="text-zinc-700">{course.quizzes.length}</strong> quizzes</span>
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
                className={`w-full justify-start text-sm ${tab === key ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="w-4 h-4 mr-2 shrink-0" />
                {label}
              </Button>
            </Link>
          ))}

          <div className="pt-4 border-t border-zinc-200">
            <Link href={`/admin/all-courses/${courseId}/roadmap`}>
              <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-5 mt-1">
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
              <h2 className="text-lg font-bold text-zinc-900">Course Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Modules", value: course.modules.length, color: "bg-blue-50 text-blue-600", icon: LayoutList },
                  { label: "Lessons", value: course.modules.reduce((sum, m) => sum + m.lessons.length, 0), color: "bg-emerald-50 text-emerald-600", icon: BookOpen },
                  { label: "Assignments", value: course.assignments.length, color: "bg-amber-50 text-amber-600", icon: CheckCircle },
                  { label: "Quizzes", value: course.quizzes.length, color: "bg-purple-50 text-purple-600", icon: HelpCircle },
                  { label: "Resources", value: course.readingMaterials.length, color: "bg-rose-50 text-rose-600", icon: FileText },
                  { label: "Enrolled", value: course._count.enrollments, color: "bg-indigo-50 text-indigo-600", icon: Users },
                ].map(({ label, value, color, icon: Icon }) => (
                  <Card key={label} className="border-zinc-100 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-zinc-900">{value}</p>
                        <p className="text-xs text-zinc-500">{label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Course Details Edit Form */}
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="w-4 h-4 text-indigo-500" />
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
                      <Input name="title" defaultValue={course.title} required className="bg-white border-zinc-200" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea name="description" defaultValue={course.description || ""} rows={4} placeholder="Course description..." className="bg-white border-zinc-200 resize-none" />
                    </div>
                    <Button type="submit" className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold">Save Changes</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MODULES TAB */}
          {tab === "modules" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-slate-700" />
                <h3 className="text-xl font-bold text-slate-800">Course Modules</h3>
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
                          <form action={adminDeleteModule}>
                            <input type="hidden" name="moduleId" value={mod.id} />
                            <input type="hidden" name="courseId" value={courseId} />
                            <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8">Delete Module</Button>
                          </form>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {/* Lessons */}
                        <details className="group border border-slate-200 rounded-md bg-slate-50" open>
                          <summary className="font-semibold text-sm cursor-pointer p-3 outline-none hover:bg-slate-100 transition-colors list-none flex justify-between">
                            Lessons <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="p-3 pt-0 space-y-2 bg-white">
                            {mod.lessons.map(l => (
                              <div key={l.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                <span className="text-slate-700">{l.title}</span>
                                {l.videoUrl && (
                                  <a href={l.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> Video
                                  </a>
                                )}
                              </div>
                            ))}
                            {mod.lessons.length === 0 && <div className="text-xs text-slate-400">No lessons yet.</div>}
                            <div className="pt-2">
                              <form action={adminCreateLesson} className="flex gap-2">
                                <input type="hidden" name="moduleId" value={mod.id} />
                                <input type="hidden" name="courseId" value={courseId} />
                                <Input name="title" placeholder="New lesson title..." className="h-8 text-sm" required />
                                <Input name="videoUrl" placeholder="Video URL (optional)" className="h-8 text-sm" />
                                <Button type="submit" size="sm" className="h-8 bg-slate-900 text-white shrink-0">Add Lesson</Button>
                              </form>
                            </div>
                          </div>
                        </details>

                        {/* Recorded Videos */}
                        {mod.recordedClasses.length > 0 && (
                          <details className="group border border-slate-200 rounded-md bg-slate-50">
                            <summary className="font-semibold text-sm cursor-pointer p-3 outline-none hover:bg-slate-100 transition-colors list-none flex justify-between">
                              Recorded Videos ({mod.recordedClasses.length}) <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-3 pt-0 space-y-2 bg-white">
                              {mod.recordedClasses.map(l => (
                                <div key={l.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                  <VideoPlayerModal videoUrl={l.videoUrl} title={l.title} duration={l.duration}>
                                    <span className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer">
                                      <PlayCircle className="w-4 h-4 text-indigo-400" /> {l.title}
                                    </span>
                                  </VideoPlayerModal>
                                  <form action={adminDeleteRecordedClass}>
                                    <input type="hidden" name="id" value={l.id} />
                                    <input type="hidden" name="courseId" value={courseId} />
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600 h-7 text-xs">Delete</Button>
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
                  <Button type="submit" className="bg-slate-900 text-white">Create Module</Button>
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
              <Card className="border-slate-200 shadow-sm">
                <CardHeader><CardTitle className="text-lg">Create Assignment</CardTitle></CardHeader>
                <CardContent>
                  <form action={adminCreateAssignment} className="space-y-4">
                    <input type="hidden" name="courseId" value={courseId} />
                    <div className="space-y-2"><Label>Title</Label><Input name="title" required placeholder="Assignment title..." /></div>
                    <div className="space-y-2"><Label>Description</Label><Textarea name="description" placeholder="Instructions..." /></div>
                    <div className="space-y-2"><Label>Problem Statement (Drive link)</Label><Input name="driveLink" placeholder="https://drive.google.com/..." /></div>
                    <div className="space-y-2">
                      <Label>Deadline <span className="text-slate-400 font-normal">(optional)</span></Label>
                      <Input name="deadline" type="datetime-local" className="bg-white" />
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
                          <a href={asgn.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> View Problem Statement
                          </a>
                        )}
                      </div>
                      <form action={adminDeleteResource} className="shrink-0">
                        <input type="hidden" name="id" value={asgn.id} />
                        <input type="hidden" name="type" value="assignment" />
                        <input type="hidden" name="courseId" value={courseId} />
                        <Button type="submit" variant="ghost" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
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
              {course.assignments.length === 0 && <p className="text-center py-12 text-slate-400">No assignments created yet.</p>}
            </div>
          )}

          {/* QUIZZES TAB */}
          {tab === "quizzes" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Quiz Management</h2>
                <form action={adminCreateQuiz} className="flex gap-2">
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
                    <form action={adminDeleteQuiz}>
                      <input type="hidden" name="id" value={quiz.id} />
                      <input type="hidden" name="courseId" value={courseId} />
                      <Button type="submit" variant="ghost" size="sm" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </form>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      {quiz.questions.map((q, qIdx) => (
                        <div key={q.id} className="p-4 border rounded-md bg-white relative group">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">{q.type}</span>
                            <form action={adminDeleteQuestion}>
                              <input type="hidden" name="id" value={q.id} />
                              <input type="hidden" name="courseId" value={courseId} />
                              <Button type="submit" variant="ghost" size="sm" className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </form>
                          </div>
                          <p className="font-medium mt-1">{qIdx + 1}. {q.text}</p>
                          {q.type === "MCQ" && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className={`flex items-center gap-2 text-sm p-2 rounded border ${q.correctOption === oIdx ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-100"}`}>
                                  <input type="radio" checked={q.correctOption === oIdx} readOnly className="accent-green-600" />
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="pt-6 border-t border-slate-100">
                      <p className="text-sm font-bold mb-4">Add New Question</p>
                      <form action={adminAddQuestion} className="space-y-4">
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
                            <Input name="text" required placeholder="Question text..." />
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-md space-y-3">
                          <Label className="text-xs font-bold text-slate-600">Answer Options</Label>
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                              <input type="radio" name="correctOption" value={i} defaultChecked={i === 0} className="accent-zinc-900 shrink-0" />
                              <Input name={`opt${i}`} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="bg-white" />
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
              {course.quizzes.length === 0 && <p className="text-center py-12 text-slate-400">No quizzes created yet.</p>}
            </div>
          )}

          {/* STUDENTS TAB */}
          {tab === "students" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold">Enrolled Students</h2>
                </div>
                <span className="text-sm font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                  {enrollments.length} enrolled
                </span>
              </div>
              {enrollments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-lg font-semibold text-slate-500">No students enrolled yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">#</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Student</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Email</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {enrollments.map((enr, idx) => (
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
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${Math.round(enr.progress * 100)}%` }} />
                              </div>
                              <span className="text-xs text-slate-600 font-bold">{Math.round(enr.progress * 100)}%</span>
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
                <Activity className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-bold">Course Activity Log</h2>
              </div>
              {courseActivities.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p>No activity recorded yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  {courseActivities.map((act, i) => (
                    <div key={act.id} className={`flex items-start gap-4 px-5 py-3.5 ${i < courseActivities.length - 1 ? "border-b border-zinc-100" : ""} hover:bg-zinc-50/50 transition-colors`}>
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800">{act.action}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
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
