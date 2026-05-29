import { prisma } from "@/lib/prisma";
import { getDashboardContext } from "../_lib";
import { QuizzesPageClient } from "./quizzes-client";

export const dynamic = "force-dynamic";

export interface QuizRow {
  id: string;
  title: string;
  courseTitle: string;
  courseId: string;
  questions: number;
  submissions: number;
}

export default async function QuizzesPage() {
  const ctx = await getDashboardContext();

  const quizzes = await prisma.quiz.findMany({
    where: { course: { creatorId: ctx.userId, organizationId: ctx.orgId } },
    include: {
      course: { select: { id: true, title: true } },
      _count: { select: { questions: true, submissions: true } },
    },
    orderBy: { id: "desc" },
  });

  const rows: QuizRow[] = quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    courseTitle: q.course.title,
    courseId: q.course.id,
    questions: q._count.questions,
    submissions: q._count.submissions,
  }));

  return <QuizzesPageClient quizzes={rows} />;
}
