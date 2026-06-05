import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import StudentRoadmapViewer from "@/components/roadmap/StudentRoadmapViewer";
import { getCurrentUser } from "@/lib/session";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapIcon, LayoutList, BookMarked, ClipboardList, HelpCircle, Star, MessageSquare } from 'lucide-react';

export default async function StudentRoadmapPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params;
  
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      courseRoadmap: {
        include: {
          phases: {
            orderBy: { order: "asc" },
            include: {
              topics: {
                orderBy: { order: "asc" },
                include: {
                  subtopics: {
                    orderBy: { order: "asc" },
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!course) {
    return notFound();
  }

  // Fetch student progress for this course
  const progressRecords = await prisma.studentRoadmapProgress.findMany({
    where: {
      studentId: user.id,
      subtopic: {
        topic: {
          phase: {
            roadmap: {
              courseId: course.id
            }
          }
        }
      }
    },
    select: {
      subtopicId: true
    }
  });

  const completedSubtopicIds = progressRecords.map(r => r.subtopicId);

  return (
    <div className="course-theme-scope max-w-6xl mx-auto p-8 space-y-6">
      
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)" }} className="pb-6">
        <h2 className="text-3xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Course Content</h2>
        <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>Navigate through modules, materials, and live sessions using the sidebar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4">
        
        {/* SIDEBAR TABS */}
        <div className="space-y-2">
          <Link href={`/student/courses/${course.id}/roadmap`}>
            <Button className="w-full justify-start font-semibold py-5 mb-4 rounded-lg" style={{ background: "var(--foreground)", color: "var(--background)", border: "none" }}>
              <MapIcon className="w-5 h-5 mr-3" /> View Interactive Roadmap
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=modules`}>
            <Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}>
              <LayoutList className="w-4 h-4 mr-3" /> Modules
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=reading`}>
            <Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}>
              <BookMarked className="w-4 h-4 mr-3" /> Reading Materials
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=assignments`}>
            <Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}>
              <ClipboardList className="w-4 h-4 mr-3" /> Assignments
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=quizzes`}>
            <Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}>
              <HelpCircle className="w-4 h-4 mr-3" /> Quizzes
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=reviews`}>
            <Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}>
              <Star className="w-4 h-4 mr-3" /> Reviews
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=feedback`}>
            <Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}>
              <MessageSquare className="w-4 h-4 mr-3" /> Feedback
            </Button>
          </Link>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="md:col-span-3">
          <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-xl overflow-hidden">
            <StudentRoadmapViewer 
              courseId={course.id} 
              initialRoadmap={course.courseRoadmap} 
              completedSubtopicIds={completedSubtopicIds} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}
