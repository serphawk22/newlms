import BarsLoader from "@/components/ui/bars-loader";
import { CourseDetailSkeleton } from "@/components/skeletons/CourseDetailSkeleton";

export default function CourseDetailLoading() {
  return (
    <div className="bg-zinc-50 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <BarsLoader size="lg" />
        <BarsLoader size="lg" />
      <CourseDetailSkeleton />
    </div>
  );
}
