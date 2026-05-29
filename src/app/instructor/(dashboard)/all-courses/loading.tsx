import { Loader } from "@/components/ui/loader";

export default function AllCoursesLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader variant="ring" label="Loading courses…" />
    </div>
  );
}
