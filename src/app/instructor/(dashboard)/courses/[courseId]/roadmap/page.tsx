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
    <div className="course-theme-scope container-page space-y-8">
      {/* Course Title Header */}
      <div className="flex items-center justify-between">
        <Link href="/instructor">
          <Button variant="ghost" className="px-0" style={{ color: "var(--muted-foreground)" }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Workspace
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{course.title}</h1>
          <span className={`status-badge ${course.published ? 'status-badge--success' : 'status-badge--warning'}`}>
            {course.published ? 'PUBLISHED' : 'DRAFT'}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-6">
        


        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
          
          {/* SIDEBAR */}
          <div className="space-y-4">
            <Link href={`/instructor/courses/${course.id}/roadmap`}>
              <Button className="w-full justify-start font-semibold py-5 mb-4 rounded-lg" style={{ background: "var(--foreground)", color: "var(--background)", border: "none" }}>
                <MapIcon className="w-5 h-5 mr-3" /> View Interactive Roadmap
              </Button>
            </Link>
            <div className="space-y-2">
              <Link href={`/instructor/courses/${course.id}?tab=modules`}><Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}><LayoutList className="w-4 h-4 mr-2" /> Modules</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=reading`}><Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}><FileText className="w-4 h-4 mr-2" /> Reading Materials</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=assignments`}><Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}><CheckCircle className="w-4 h-4 mr-2" /> Assignments</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=quizzes`}><Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}><HelpCircle className="w-4 h-4 mr-2" /> Quizzes & Tests</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=students`}><Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}><Users className="w-4 h-4 mr-2" /> Students Info</Button></Link>
              <Link href={`/instructor/courses/${course.id}?tab=adminfeedback`}><Button variant="ghost" className="w-full justify-start" style={{ color: "var(--muted-foreground)" }}><MessageSquare className="w-4 h-4 mr-2" /> Admin Feedback</Button></Link>
            </div>
          </div>

          <div className="md:col-span-3">
            <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-xl overflow-hidden">
              <InstructorRoadmapBuilder courseId={course.id} initialRoadmap={course.courseRoadmap} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
