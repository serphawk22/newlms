import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteLessonButton } from "@/components/DeleteLessonButton";
import { ArrowLeft, Cloud, Save, Globe, Lock, ExternalLink } from "lucide-react";


// Server Action: Update Lesson Details
async function updateLesson(formData: FormData) {
  "use server";
  const lessonId = formData.get("lessonId") as string;
  const courseId = formData.get("courseId") as string;
  const title = formData.get("title") as string;
  const videoUrl = formData.get("videoUrl") as string;

  if (lessonId && title) {
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } }
    });

    if (!existingLesson) return;

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { 
        title, 
        videoUrl: videoUrl || null 
      }
    });

    if (videoUrl) {
      await prisma.adminReviewVideo.deleteMany({ where: { lessonId } });
      await prisma.adminReviewVideo.create({
        data: {
          courseId,
          moduleId: existingLesson.moduleId,
          lessonId,
          instructorId: existingLesson.module.course.creatorId,
          videoUrl,
          status: "PENDING"
        }
      });
    } else {
      await prisma.adminReviewVideo.deleteMany({ where: { lessonId } });
    }

    revalidatePath(`/instructor/courses/${courseId}`);
    revalidatePath(`/instructor/courses/${courseId}/lessons/${lessonId}`);
  }
}

export default async function LessonEditorPage({ 
  params 
}: { 
  params: Promise<{ courseId: string; lessonId: string }> 
}) {
  const { courseId, lessonId } = await params;
  
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { 
      module: true,
      adminReviewVideos: true 
    }
  });

  if (!lesson) redirect(`/instructor/courses/${courseId}`);

  const reviewVideo = lesson.adminReviewVideos?.[0];

  const menuItems = [
    { label: 'Workspace', ariaLabel: 'Go back to workspace', link: '/instructor' },
    { label: 'Course Builder', ariaLabel: 'Go back to course', link: `/instructor/courses/${courseId}` },
    { label: 'Directory', ariaLabel: 'View directory', link: '/instructor#directory' },
    { label: 'My Profile', ariaLabel: 'View profile', link: '/instructor/profile' },
  ];

  const socialItems = [
    { label: 'Admin Hub', link: '/admin' },
    { label: 'Support', link: '/support' }
  ];

  return (
    <div className="course-theme-scope container-page space-y-8">
      {/* Lesson Header */}
      <div className="flex items-center justify-between">
        <Link href={`/instructor/courses/${courseId}`}>
          <Button variant="ghost" className="text-[var(--muted-foreground)] hover:bg-[var(--secondary-background)] hover:text-[var(--foreground)] px-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Curriculum
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Lesson Settings</h2>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-6">
            <Card className="border-[var(--border)] shadow-sm bg-[var(--card)]">
              <CardHeader>
                <CardTitle className="text-lg">Resource Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateLesson} className="space-y-6">
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <input type="hidden" name="courseId" value={courseId} />
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Lesson Title</Label>
                    <Input id="title" name="title" defaultValue={lesson.title} required className="bg-[var(--card)]"/>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Google Drive Link / Video URL</Label>
                    <div className="relative">
                      <Cloud className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                      <Input id="videoUrl" name="videoUrl" placeholder="https://drive.google.com/file/d/..." defaultValue={lesson.videoUrl || ""} className="pl-9 bg-[var(--card)]"/>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">Video uploaded here will be sent to Admins for review and will remain hidden from students.</p>
                  </div>

                  <Button type="submit" className="w-full bg-[#D9252A] text-white hover:bg-[#C21F24]">
                    <Save className="w-4 h-4 mr-2"/> Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            
            <Card className="border-[var(--border)] shadow-sm bg-[rgba(217,37,42,0.04)] flex flex-col items-center justify-center text-[var(--muted-foreground)] p-8 text-center min-h-[200px]">
               <ExternalLink className="w-12 h-12 mb-4 text-[#D9252A] opacity-80"/>
               <p className="text-sm font-semibold text-[var(--foreground)]">External Resource Configuration</p>
               <p className="text-xs mt-2 max-w-[250px] text-[var(--muted-foreground)]">This lesson is configured to save bandwidth. Students clicking this lesson will be safely routed to the attached Drive document.</p>
            </Card>
          </div>

          
          <div className="space-y-6">
            <Card className="border-[var(--border)] shadow-none bg-[var(--card)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Visibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <Globe className="text-[#D9252A] w-4 h-4"/> Published
                    </div>
                    <div className="w-8 h-4 bg-[#D9252A] rounded-full relative">
                      <div className="absolute right-1 top-1 w-2 h-2 bg-[var(--card)] rounded-full"></div>
                    </div>
                  </div>

                  {reviewVideo && (
                    <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)] font-medium">Video Review Status</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        reviewVideo.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        reviewVideo.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {reviewVideo.status}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-100 bg-red-50 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-red-900 uppercase tracking-wider">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <DeleteLessonButton lessonId={lessonId} courseId={courseId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
