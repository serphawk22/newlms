import { Loader } from "@/components/ui/loader";

export default function CustomReportsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-zinc-50">
      <Loader variant="ring" label="Loading custom reports…" />
    </div>
  );
}
