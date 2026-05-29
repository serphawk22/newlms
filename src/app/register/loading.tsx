import { Loader } from "@/components/ui/loader";

export default function RegisterLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <Loader variant="ring" />
    </div>
  );
}
