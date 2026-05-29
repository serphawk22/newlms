import BarsLoader from "@/components/ui/bars-loader";

export default function StudentProfileLoading() {
  return (
    <div className="bg-zinc-50 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <BarsLoader size="lg" />
        <BarsLoader size="lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-zinc-200 rounded-xl" />
          <div className="h-48 bg-zinc-200 rounded-xl" />
        </div>
      </div>
  );
}
