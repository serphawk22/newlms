import BarsLoader from "@/components/ui/bars-loader";

export default function StudentLoading() {
  return (
    <div className="bg-zinc-50 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <BarsLoader size="lg" />
        <BarsLoader size="lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-zinc-200 rounded-xl" />
          <div className="h-80 bg-zinc-200 rounded-xl" />
        </div>
    </div>
  );
}
