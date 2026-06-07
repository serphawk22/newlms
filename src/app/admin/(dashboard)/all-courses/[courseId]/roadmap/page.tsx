import { redirect } from "next/navigation";

export default async function AdminCourseRoadmapPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  // Show roadmap from the instructor's roadmap component via redirect
  redirect(`/admin/all-courses/${courseId}?tab=overview`);
}
