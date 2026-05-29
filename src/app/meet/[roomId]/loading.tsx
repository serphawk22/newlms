import { Loader } from "@/components/ui/loader";

export default function MeetLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <Loader variant="ring" label="Joining room…" />
    </div>
  );
}
