import { Loader } from "@/components/ui/loader";

export default function LearningActivitiesLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-zinc-50">
      <Loader variant="ring" label="Loading learning activities…" />
    </div>
  );
}
