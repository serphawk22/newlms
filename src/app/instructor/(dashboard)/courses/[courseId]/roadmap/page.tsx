import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import InstructorRoadmapBuilder from "@/components/roadmap/InstructorRoadmapBuilder";
import Link from 'next/link';
import { ArrowLeft, ExternalLink, LayoutList, FileText, CheckCircle, HelpCircle, Users, MessageSquare, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function InstructorRoadmapPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params;
  
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
              <Link href={`/instructor/courses/${course.id}?tab=modules`}><Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100"><LayoutList className="w-4 h-4 mr-2" /> Modules</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=reading`}><Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100"><FileText className="w-4 h-4 mr-2" /> Reading Materials</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=assignments`}><Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100"><CheckCircle className="w-4 h-4 mr-2" /> Assignments</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=quizzes`}><Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100"><HelpCircle className="w-4 h-4 mr-2" /> Quizzes & Tests</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=students`}><Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100"><Users className="w-4 h-4 mr-2" /> Students Info</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=adminfeedback`}><Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100"><MessageSquare className="w-4 h-4 mr-2" /> Admin Feedback</Button></Link>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <InstructorRoadmapBuilder courseId={course.id} initialRoadmap={course.courseRoadmap} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
