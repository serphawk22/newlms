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
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-bold tracking-tight">Course Content</h2>
        <p className="text-slate-500 mt-2">Navigate through modules, materials, and live sessions using the sidebar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4">
        
        {/* SIDEBAR TABS */}
        <div className="space-y-2">
          <Link href={`/student/courses/${course.id}/roadmap`}>
            <Button className="w-full justify-start bg-[#D9252A] hover:bg-[#C21F24] text-white font-bold py-6 shadow-lg shadow-[rgba(217,37,42,0.2)] mb-4 rounded-xl border border-[#D9252A]">
              <MapIcon className="w-5 h-5 mr-3" /> View Interactive Roadmap
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=modules`}>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100">
              <LayoutList className="w-4 h-4 mr-3" /> Modules
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=reading`}>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100">
              <BookMarked className="w-4 h-4 mr-3" /> Reading Materials
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=assignments`}>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100">
              <ClipboardList className="w-4 h-4 mr-3" /> Assignments
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=quizzes`}>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100">
              <HelpCircle className="w-4 h-4 mr-3" /> Quizzes
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=reviews`}>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100">
              <Star className="w-4 h-4 mr-3" /> Reviews
            </Button>
          </Link>
          <Link href={`/student/courses/${course.id}?tab=feedback`}>
            <Button variant="ghost" className="w-full justify-start text-zinc-600 hover:bg-zinc-100">
              <MessageSquare className="w-4 h-4 mr-3" /> Feedback
            </Button>
          </Link>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
