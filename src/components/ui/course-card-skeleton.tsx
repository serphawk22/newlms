export function CourseCardSkeleton() {
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-40 bg-zinc-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-zinc-200 rounded w-3/4" />
        <div className="h-4 bg-zinc-200 rounded w-1/2" />
        <div className="h-9 bg-zinc-200 rounded-lg w-full mt-4" />
      </div>
    </div>
  );
}

export function CourseCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
