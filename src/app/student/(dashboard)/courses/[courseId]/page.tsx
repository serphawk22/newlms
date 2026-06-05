import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, PlayCircle, FileText, CheckCircle, ExternalLink,
  BookOpen, ClipboardList, BookMarked, LayoutList, HelpCircle, Radio, Video, Link2, Star, MonitorPlay, MessageSquare, Eye, MapIcon, Clock, XCircle, Share2
} from "lucide-react";
import { CourseChatbotWrapper } from "@/components/CourseChatbotWrapper";
import { AssignmentSubmitForm } from "@/components/AssignmentSubmitForm";
import { CourseReviewSection } from "@/components/CourseReviewSection";
import { ActivityLink } from "@/components/ActivityLink";
import { QuizTaker } from "@/components/QuizTaker";
import { RecordedClassesTab } from "@/components/RecordedClassesTab";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { FileViewerModal } from "@/components/modals/FileViewerModal";
import { StudentFeedbackTab } from "@/components/admin/StudentFeedbackTab";
import { CourseCommentsTab } from "@/components/CourseCommentsTab";
import { ShareWhatYouLearned } from "@/components/ShareWhatYouLearned";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// Force dynamic rendering — this page reads cookies and makes per-user DB
// queries, so Next.js must never serve a cached RSC payload for any tab URL.
export const dynamic = "force-dynamic";



export default async function StudentCourseView({ 
  params,
  searchParams
}: { 
  params: Promise<{ courseId: string }>,
  searchParams: Promise<{ tab?: string }>
}) {
  const resolvedParams = await params;
  const courseId = resolvedParams.courseId;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab || "modules";

  // Get logged-in user ID and role from JWT cookie
  let studentId: string | null = null;
  let userRole: string | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
      const { payload } = await jwtVerify(token, secret);
      studentId = (payload.userId as string) ?? null;
      userRole = (payload.role as string) ?? null;
    }
  } catch { /* not logged in */ }

  const isInstructorOrAdmin = userRole === "INSTRUCTOR" || userRole === "ADMIN";

  const studentUser = studentId ? await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, email: true },
  }) : null;
  const studentName = studentUser?.name || "Student";
  const studentEmail = studentUser?.email || "";

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: tab === "modules" ? {
        orderBy: { id: "asc" },
        include: {
          lessons: { orderBy: { id: "asc" } },
          liveSessions: { orderBy: { createdAt: "desc" } },
          recordedClasses: { orderBy: { createdAt: "desc" } },
        },
      } : false,
      readingMaterials: tab === "reading" ? {
        orderBy: { createdAt: "desc" },
        include: { file: true },
      } : false,
      assignments: tab === "assignments" ? { orderBy: { createdAt: "desc" } } : false,
      quizzes: tab === "quizzes" ? { include: { questions: true } } : false,
      liveSessions: tab === "live" ? { orderBy: { createdAt: "desc" } } : false,
    },
  });

  if (!course) redirect("/student");

  // ── Enrollment guard ─────────────────────────────────────────────────────────
  // Check enrollment status: ACTIVE → show content, PENDING/REJECTED → show message, None → redirect
  // Instructors and admins can preview any course without enrolling.
  let enrollmentStatus: string | null = null;
  if (studentId) {
    if (isInstructorOrAdmin) {
      enrollmentStatus = "ACTIVE";
    } else {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: studentId, courseId } },
        select: { status: true },
      });
      enrollmentStatus = enrollment?.status || null;
      if (!enrollment) redirect("/student/courses");
    }
  } else {
    redirect("/login");
  }

  // If enrollment is not ACTIVE, show status message instead of full content
  if (enrollmentStatus === "PENDING") {
    return (
      <div className="course-theme-scope container-page flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--secondary-background)] border border-[var(--border)] flex items-center justify-center">
            <Clock className="w-8 h-8 text-[var(--muted-foreground)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Request Pending</h2>
          <p className="text-[var(--muted-foreground)] mb-6">Your request to join {course.title} is pending instructor approval. You will be notified once it is accepted.</p>
          <Link href="/student/courses">
            <Button variant="outline">Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (enrollmentStatus === "REJECTED") {
    return (
      <div className="course-theme-scope container-page flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--secondary-background)] border border-[var(--border)] flex items-center justify-center">
            <XCircle className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Request Not Accepted</h2>
          <p className="text-[var(--muted-foreground)] mb-6">Your request to join {course.title} was not accepted. Please contact your instructor for more information.</p>
          <Link href="/student/courses">
            <Button variant="outline">Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch this student's assignment submissions
  type SubmissionRow = {
    id: string; assignmentId: string; driveLink: string;
    fileUrl: string | null; publicId: string | null;
    fileType: string | null; mimeType: string | null;
    fileSize: number | null; originalFileName: string | null;
    grade: number | null; maxGrade: number; feedback: string | null;
    submittedAt: Date; gradedAt: Date | null;
  };

  // Fetch this student's quiz submissions for this course's quizzes
  type QuizSubmissionRow = {
    quizId: string;
    obtainedMarks: number;
    totalMarks: number;
    answers: Record<string, number | string>;
    submittedAt: Date;
  };

  // Run submission queries sequentially to prevent Neon connection spikes
  let rawSubs: any[] = [];
  let rawQuizSubs: any[] = [];

  if (tab === "assignments" && course.assignments && course.assignments.length > 0) {
    rawSubs = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: studentId!,
        assignmentId: { in: course.assignments.map((a) => a.id) },
      },
      select: {
        id: true, assignmentId: true, driveLink: true,
        fileUrl: true, publicId: true,
        fileType: true, mimeType: true,
        fileSize: true, originalFileName: true,
        fileId: true, file: true,
        grade: true, maxGrade: true, feedback: true,
        submittedAt: true, gradedAt: true,
      },
    }).catch(() => [] as SubmissionRow[]);
  }

  if (tab === "quizzes" && course.quizzes && course.quizzes.length > 0) {
    rawQuizSubs = await prisma.quizSubmission.findMany({
      where: {
        studentId: studentId!,
        quizId: { in: course.quizzes.map((q) => q.id) },
      },
      select: {
        quizId: true,
        obtainedMarks: true,
        totalMarks: true,
        answers: true,
        submittedAt: true,
      },
    }).catch(() => []);
  }

  const submissionMap = new Map<string, SubmissionRow>();
  for (const s of rawSubs) submissionMap.set(s.assignmentId, s);

  const quizSubmissionMap = new Map<string, QuizSubmissionRow>();
  for (const s of rawQuizSubs) {
    quizSubmissionMap.set(s.quizId, {
      ...s,
      answers: s.answers as Record<string, number | string>,
    });
  }

  const menuItems = [
    { label: 'Back to Dashboard', ariaLabel: 'Go back to dashboard', link: '/student' },
    { label: 'Modules', ariaLabel: 'View modules', link: `?tab=modules` },
    { label: 'Reading Materials', ariaLabel: 'View materials', link: `?tab=reading` },
    { label: 'Assignments', ariaLabel: 'View assignments', link: `?tab=assignments` },
    { label: 'Quizzes', ariaLabel: 'View quizzes', link: `?tab=quizzes` },
    { label: 'Live Classes', ariaLabel: 'View live classes', link: `?tab=live` },
  ];

  const socialItems = [
    { label: 'Discord', link: 'https://discord.com' },
    { label: 'Support', link: '/support' }
  ];

  return (
    <div className="course-theme-scope container-page space-y-8">
      {/* Preview banner for instructors/admins */}
      {isInstructorOrAdmin && (
        <div className="bg-[var(--secondary-background)] border border-[var(--border)] text-[var(--foreground)] px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm font-semibold">
            You are previewing this course as {userRole?.toLowerCase()}.
          </span>
          <Link href={`/instructor/courses/${courseId}`}>
            <Button variant="outline" size="sm" className="text-xs h-7">
              Back to Instructor Panel
            </Button>
          </Link>
        </div>
      )}

      {/* Course Title Header */}
      <div className="flex items-center justify-between">
        <Link href="/student">
          <Button variant="ghost" className="text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)] px-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{course.title}</h1>
          
        </div>
      </div>


      <div className="max-w-6xl mx-auto p-8 space-y-6">
        
        {/* Header */}
        <div className="border-b border-[var(--border)] pb-6">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Course Content</h2>
          <p className="text-[var(--muted-foreground)] mt-2">Navigate through modules, materials, and live sessions using the sidebar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4">
          
          {/* SIDEBAR TABS */}
          <div className="space-y-2">
            <Link href={`/student/courses/${course.id}/roadmap`}>
              <Button variant="ghost" className="w-full justify-start text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]">
                <MapIcon className="w-4 h-4 mr-3 shrink-0" /> View Interactive Roadmap
              </Button>
            </Link>
            <Link href={`?tab=modules`}>
              <Button variant={tab === "modules" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "modules" ? "bg-[var(--card)] text-[var(--foreground)] font-semibold border-l-2 border-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]"}`}>
                <LayoutList className="w-4 h-4 mr-3" /> Modules
              </Button>
            </Link>
            <Link href={`?tab=reading`}>
              <Button variant={tab === "reading" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "reading" ? "bg-[var(--card)] text-[var(--foreground)] font-semibold border-l-2 border-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]"}`}>
                <BookMarked className="w-4 h-4 mr-3" /> Reading Materials
              </Button>
            </Link>
            <Link href={`?tab=assignments`}>
              <Button variant={tab === "assignments" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "assignments" ? "bg-[var(--card)] text-[var(--foreground)] font-semibold border-l-2 border-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]"}`}>
                <ClipboardList className="w-4 h-4 mr-3" /> Assignments
              </Button>
            </Link>
            <Link href={`?tab=quizzes`}>
              <Button variant={tab === "quizzes" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "quizzes" ? "bg-[var(--card)] text-[var(--foreground)] font-semibold border-l-2 border-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]"}`}>
                <HelpCircle className="w-4 h-4 mr-3" /> Quizzes
              </Button>
            </Link>
            <Link href={`?tab=reviews`}>
              <Button variant={tab === "reviews" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "reviews" ? "bg-[var(--card)] text-[var(--foreground)] font-semibold border-l-2 border-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]"}`}>
                <Star className="w-4 h-4 mr-3" /> Reviews
              </Button>
            </Link>
            <Link href={`?tab=comments`}>
              <Button variant={tab === "comments" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "comments" ? "bg-[rgba(217,37,42,0.08)] text-[#D9252A] font-bold" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]"}`}>
                <MessageSquare className="w-4 h-4 mr-3" /> Q&A
              </Button>
            </Link>
            <Link href={`?tab=feedback`}>
              <Button variant={tab === "feedback" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "feedback" ? "bg-[var(--card)] text-[var(--foreground)] font-bold border-l-2 border-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]"}`}>
                <MessageSquare className="w-4 h-4 mr-3" /> Feedback
              </Button>
            </Link>
            <Link href={`?tab=share`}>
              <Button variant={tab === "share" ? "secondary" : "ghost"} className={`w-full justify-start ${tab === "share" ? "bg-[rgba(217,37,42,0.08)] text-[#D9252A] font-bold" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)]"}`}>
                <Share2 className="w-4 h-4 mr-3" /> Share Your Learning
              </Button>
            </Link>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="md:col-span-3">
            
            {/* ---- MODULES ---- */}
            {tab === "modules" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutList className="w-6 h-6 text-[var(--foreground)]" />
                  <h3 className="text-2xl font-bold text-[var(--foreground)]">Course Modules</h3>
                </div>
                
                {course.modules.length === 0 ? (
                  <div className="text-center py-16 text-[var(--muted-foreground)] bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-sm">
                    No modules have been published for this course yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {course.modules.map((module, index) => (
                      <Card key={module.id} className="border-[var(--border)] shadow-sm overflow-hidden bg-[var(--card)] hover:border-[var(--accent)]/40 transition-colors">
                        <CardHeader className="bg-[var(--secondary-background)] border-b border-[var(--border)] py-4">
                          <CardTitle className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-[var(--muted-foreground)]" />
                            Module {index + 1}: {module.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">

                          {/* ── Lessons ── */}
                          <div className="divide-y divide-[var(--border)]">
                            {(module as any).lessons.length === 0 ? (
                              <div className="p-6 text-sm text-[var(--muted-foreground)] text-center bg-[var(--secondary-background)]/30">No lessons posted yet.</div>
                            ) : (
                              (module as any).lessons.map((lesson: any, lessonIndex: number) => (
                                <div key={lesson.id} className="flex items-center justify-between p-4 hover:bg-[var(--secondary-background)]/60 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[var(--secondary-background)] border border-[var(--border)] flex items-center justify-center shrink-0">
                                      <PlayCircle className="w-4 h-4 text-[var(--muted-foreground)]" />
                                    </div>
                                    <span className="font-semibold text-[var(--foreground)]">
                                      {lessonIndex + 1}. {lesson.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {lesson.videoUrl && (
                                      <ActivityLink href={lesson.videoUrl} type="VIDEO" message={`Watched video: ${lesson.title}`}>
                                        <Button size="sm" className="bg-[var(--card)] hover:bg-[var(--secondary-background)] text-[var(--foreground)] ">
                                                          
                                                                   
                                          <PlayCircle className="w-4 h-4 mr-2" /> Watch
                                        </Button>
                                      </ActivityLink>
                                    )}
                                    {lesson.driveLink && (
                                      <ActivityLink href={lesson.driveLink} type="MATERIAL" message={`Opened notes: ${lesson.title}`}>
                                        <Button size="sm" variant="outline" className="border-[var(--border)] text-[var(--foreground)]">
                                          <FileText className="w-4 h-4 mr-2" /> Notes
                                        </Button>
                                      </ActivityLink>
                                    )}
                                    {!lesson.videoUrl && !lesson.driveLink && (
                                      <span className="text-xs text-[var(--muted-foreground)] font-medium px-3 py-1 bg-[var(--secondary-background)] border border-[var(--border)] rounded-full">No Content</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* ── Live Classes ── */}
                          {(module as any).liveSessions.length > 0 && (
                            <div className="border-t border-[var(--border)] px-4 py-3">
                              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] mb-2 flex items-center gap-1.5">
                                <Radio className="w-3.5 h-3.5" /> Live Classes
                              </p>
                              <div className="space-y-2">
                                {(module as any).liveSessions.map((session: any) => {
                                  const isLive = session.status === "ONGOING";
                                  const isScheduled = session.status === "SCHEDULED";
                                  const isCompleted = session.status === "COMPLETED";
                                  return (
                                    <div key={session.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                                      isLive ? "border-[var(--accent)]/50 bg-[var(--accent)]/5" :
                                      "border-[var(--border)] bg-[var(--secondary-background)]/40"
                                    }`}>
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 uppercase ${
                                          isLive ? "bg-[var(--accent)] text-white" :
                                          isScheduled ? "bg-[var(--secondary-background)] border border-[var(--border)] text-[var(--foreground)]" :
                                          "bg-[var(--secondary-background)] text-[var(--muted-foreground)]"
                                        }`}>
                                          {isLive ? "LIVE NOW" : session.status}
                                        </span>
                                        <span className="text-sm font-semibold truncate text-[var(--foreground)]">{session.title}</span>
                                        <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                                          {new Date(session.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {session.recordingUrl && (
                                          <VideoPlayerModal
                                            videoUrl={session.recordingUrl}
                                            title={`Recording: ${session.title}`}
                                          >
                                            <Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--foreground)] text-xs hover:bg-[var(--secondary-background)]">
                                              <MonitorPlay className="w-3 h-3 mr-1" /> Recording
                                            </Button>
                                          </VideoPlayerModal>
                                        )}
                                        {(isLive || isScheduled) && (
                                          <Link href={`/meet/${session.roomId}`}>
                                            <Button size="sm" className={`font-semibold text-xs ${
                                              isLive ? "bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white" : "bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white"
                                            }`}>
                                              <Video className="w-3 h-3 mr-1" />
                                              {isLive ? "Join (LIVE)" : "Join Class"}
                                            </Button>
                                          </Link>
                                        )}
                                        {isCompleted && !session.recordingUrl && (
                                          <span className="text-xs text-[var(--muted-foreground)] px-2 py-1 bg-[var(--secondary-background)] border border-[var(--border)] rounded-full">Ended</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ── Recorded Videos ── */}
                          {(module as any).recordedClasses.length > 0 && (
                            <div className="border-t border-[var(--border)] px-4 py-3">
                              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 flex items-center gap-1.5">
                                <MonitorPlay className="w-3.5 h-3.5" /> Recorded Videos
                              </p>
                              <div className="space-y-2">
                                {(module as any).recordedClasses.map((rec: any) => (
                                  <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--secondary-background)]/40">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <MonitorPlay className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                                      <span className="text-sm font-medium truncate text-[var(--foreground)]">{rec.title}</span>
                                      {rec.duration && (
                                        <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                                          {Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, "0")}
                                        </span>
                                      )}
                                    </div>
                                    <VideoPlayerModal
                                      videoUrl={rec.videoUrl}
                                      title={rec.title}
                                      duration={rec.duration}
                                    >
                                      <Button size="sm" className="bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white text-xs">
                                        <PlayCircle className="w-3 h-3 mr-1" /> Watch
                                      </Button>
                                    </VideoPlayerModal>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---- READING MATERIALS ---- */}
            {tab === "reading" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <BookMarked className="w-6 h-6 text-[var(--foreground)]" />
                  <h3 className="text-2xl font-bold text-[var(--foreground)]">Reading Materials</h3>
                </div>

                {course.readingMaterials.length === 0 ? (
                  <div className="text-center py-16 text-[var(--muted-foreground)] bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-sm">
                    No reading materials available yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(course.readingMaterials as any[]).map((rm) => {
                      // Resolve file info: prefer normalized UploadedFile relation, fall back to legacy fields
                      const rmAny = rm as unknown as {
                        file?: { url: string; originalName: string; mimeType: string; size: number; extension: string } | null;
                        fileUrl?: string | null;
                        mimeType?: string | null;
                        fileType?: string | null;
                        fileSize?: number | null;
                        originalFileName?: string | null;
                      };

                      const fileUrl      = rmAny.file?.url ?? rmAny.fileUrl ?? rm.link;
                      const fileName     = rmAny.file?.originalName ?? rmAny.originalFileName ?? rm.title;
                      const mimeType     = rmAny.file?.mimeType ?? rmAny.mimeType ?? null;
                      const fileSize     = rmAny.file?.size ?? rmAny.fileSize ?? null;
                      const ext          = (rmAny.file?.extension ?? rmAny.fileType ?? "").toLowerCase();
                      const isUploaded   = !!(rmAny.file ?? rmAny.fileUrl);

                      // Simple size label
                      const sizeLabel = fileSize
                        ? fileSize < 1024 ? `${fileSize} B`
                          : fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB`
                          : `${(fileSize / 1024 / 1024).toFixed(1)} MB`
                        : "";

                      return (
                        <div key={rm.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm hover:border-[var(--accent)]/40 hover:shadow-md transition-all group overflow-hidden">
                          <div className="flex items-center justify-between p-5">
                            <div className="flex items-center gap-4 min-w-0">
                              {/* File type icon */}
                              {(() => {
                                const { Icon, color: iconColor, bg: iconBg } = isUploaded
                                  ? { Icon: FileText, color: "text-[var(--muted-foreground)]", bg: "bg-[var(--secondary-background)] border-[var(--border)]" }
                                  : { Icon: Link2, color: "text-[var(--muted-foreground)]", bg: "bg-[var(--secondary-background)] border-[var(--border)]" };
                                return (
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${iconBg} group-hover:opacity-90 transition-opacity`}>
                                    <Icon className={`w-6 h-6 ${iconColor}`} />
                                  </div>
                                );
                              })()}
                              <div className="min-w-0">
                                <p className="font-bold text-lg text-[var(--foreground)] truncate">{rm.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {isUploaded && fileName && (
                                    <span className="text-sm text-[var(--muted-foreground)] truncate max-w-[220px]">{fileName}</span>
                                  )}
                                  {isUploaded && sizeLabel && (
                                    <><span className="text-[var(--border)] text-xs">·</span>
                                    <span className="text-sm text-[var(--muted-foreground)]">{sizeLabel}</span></>
                                  )}
                                  {isUploaded && ext && (
                                    <><span className="text-[var(--border)] text-xs">·</span>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{ext}</span></>
                                  )}
                                  {!isUploaded && rm.link && (
                                    <span className="text-sm text-[var(--muted-foreground)] truncate max-w-[200px]">{rm.link}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Open Material via FileViewerModal */}
                            {fileUrl && (
                              <FileViewerModal
                                url={fileUrl}
                                title={rm.title}
                                fileName={fileName}
                                mimeType={mimeType}
                                fileSize={fileSize}
                                materialId={rm.id}
                              >
                                <Button className="ml-4 shrink-0 bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white shadow-sm">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Open Material
                                </Button>
                              </FileViewerModal>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}


            {/* ---- ASSIGNMENTS ---- */}
            {tab === "assignments" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="w-6 h-6 text-[var(--foreground)]" />
                  <h3 className="text-2xl font-bold text-[var(--foreground)]">Assignments</h3>
                </div>

                {course.assignments.length === 0 ? (
                  <div className="text-center py-16 text-[var(--muted-foreground)] bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-sm">
                    No assignments currently due.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(course.assignments as any[]).map((asgn) => {
                      const existingSub = submissionMap.get(asgn.id) ?? null;
                      return (
                        <Card key={asgn.id} className="border-[var(--border)] shadow-sm hover:border-[var(--accent)]/40 transition-all bg-[var(--card)] overflow-hidden">
                          <div className="h-1 w-full bg-[var(--accent)]/60"></div>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex items-start gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-[var(--secondary-background)] flex items-center justify-center shrink-0 border border-[var(--border)] mt-1">
                                  <CheckCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xl text-[var(--foreground)]">{asgn.title}</h4>
                                  {asgn.description && (
                                    <p className="text-[var(--muted-foreground)] mt-1 leading-relaxed text-sm whitespace-pre-wrap">{asgn.description}</p>
                                  )}
                                </div>
                              </div>
                              {asgn.driveLink && (
                                <Link href={asgn.driveLink} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                  <Button className="bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white shadow-sm">
                                    View Assignment <ExternalLink className="w-4 h-4 ml-2" />
                                  </Button>
                                </Link>
                              )}
                            </div>

                            {/* Submission form / status */}
                            <AssignmentSubmitForm
                              assignmentId={asgn.id}
                              assignmentTitle={asgn.title}
                              existingSubmission={existingSub ? {
                                id: existingSub.id,
                                driveLink: existingSub.driveLink,
                                // New normalized file relation
                                fileId: (existingSub as unknown as { fileId?: string | null }).fileId ?? null,
                                file:   (existingSub as unknown as { file?: unknown }).file as never ?? null,
                                // Legacy fallback fields
                                fileUrl:          existingSub.fileUrl          ?? null,
                                fileType:         existingSub.fileType         ?? null,
                                mimeType:         existingSub.mimeType         ?? null,
                                fileSize:         existingSub.fileSize         ?? null,
                                originalFileName: existingSub.originalFileName ?? null,
                                grade:       existingSub.grade,
                                maxGrade:    existingSub.maxGrade,
                                feedback:    existingSub.feedback,
                                submittedAt: existingSub.submittedAt.toISOString(),
                                gradedAt:    existingSub.gradedAt?.toISOString() ?? null,
                              } : null}
                            />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ---- QUIZZES ---- */}
            {tab === "quizzes" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="w-6 h-6 text-[var(--foreground)]" />
                  <h3 className="text-2xl font-bold text-[var(--foreground)]">Quizzes & Tests</h3>
                </div>

                {course.quizzes.length === 0 ? (
                  <div className="text-center py-16 text-[var(--muted-foreground)] bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-sm">
                    No quizzes available.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(course.quizzes as any[]).map((quiz) => {
                      const existingSub = quizSubmissionMap.get(quiz.id) ?? null;
                      return (
                        <Card key={quiz.id} className="border-[var(--border)] shadow-sm hover:border-[var(--accent)]/40 transition-all bg-[var(--card)] overflow-hidden">
                          <div className="h-1 w-full bg-[var(--border)]"></div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-[var(--foreground)]">
                              <HelpCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
                              {quiz.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1.5 mt-1 font-medium text-[var(--muted-foreground)]">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {quiz.questions.length} Question{quiz.questions.length !== 1 ? "s" : ""}
                              {existingSub && (
                                <span className="ml-2 text-xs bg-[var(--secondary-background)] border border-[var(--border)] text-[var(--foreground)] px-2 py-0.5 rounded-full font-bold">
                                  Submitted
                                </span>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0 pb-5">
                            <QuizTaker
                              quiz={{
                                id: quiz.id,
                                title: quiz.title,
                                retryEnabled: quiz.retryEnabled,
                                questions: (quiz.questions || []).map((q: any) => ({
                                  id: q.id,
                                  text: q.text,
                                  options: q.options,
                                  correctOption: q.correctOption,
                                  points: q.points,
                                  type: q.type,
                                })),
                              }}
                              existingSubmission={
                                existingSub
                                  ? {
                                      obtainedMarks: existingSub.obtainedMarks,
                                      totalMarks: existingSub.totalMarks,
                                      answers: existingSub.answers,
                                      submittedAt: existingSub.submittedAt.toISOString(),
                                    }
                                  : null
                              }
                            />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ---- REVIEWS ---- */}
            {tab === "reviews" && (
              <CourseReviewSection
                courseId={course.id}
                currentStudentId={studentId}
              />
            )}

            {/* ---- ADMIN / INSTRUCTOR FEEDBACK ---- */}
            {tab === "feedback" && (
              <StudentFeedbackTab courseId={courseId} />
            )}

            {/* ---- Q&A COMMENTS ---- */}
            {tab === "comments" && (
              <CourseCommentsTab courseId={courseId} />
            )}

            {/* ---- SHARE YOUR LEARNING ---- */}
            {tab === "share" && (
              <ShareWhatYouLearned
                studentName={studentName}
                studentEmail={studentEmail}
                courseTitle={course.title}
              />
            )}
          </div>
        </div>
      </div>

      {/* Floating AI Chatbot */}
      <CourseChatbotWrapper courseId={course.id} courseTitle={course.title} />
    </div>
  );
}