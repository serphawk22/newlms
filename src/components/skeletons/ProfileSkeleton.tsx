export function ProfileSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="md:w-1/3 space-y-6">
        <div className="border border-zinc-200 shadow-sm rounded-xl overflow-hidden bg-white p-8 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-zinc-200 animate-pulse mb-6" />
          <div className="h-6 w-40 bg-zinc-200 animate-pulse rounded mb-2" />
          <div className="h-4 w-56 bg-zinc-200 animate-pulse rounded mb-4" />
          <div className="h-6 w-32 bg-zinc-200 animate-pulse rounded-full mb-4" />
          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            <div className="h-20 bg-zinc-200 animate-pulse rounded-lg" />
            <div className="h-20 bg-zinc-200 animate-pulse rounded-lg" />
          </div>
          <div className="h-10 w-full bg-zinc-200 animate-pulse rounded-lg" />
        </div>
      </div>
      <div className="md:w-2/3 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-36 bg-zinc-200 animate-pulse rounded-xl" />
          <div className="h-36 bg-zinc-200 animate-pulse rounded-xl" />
        </div>
        <div className="h-64 bg-zinc-200 animate-pulse rounded-xl" />
        <div className="h-48 bg-zinc-200 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
