export function CourseDetailSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Back button */}
      <div className="h-8 w-36 bg-zinc-200 rounded-lg" />

      {/* Title + Publish button row */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-72 bg-zinc-200 rounded" />
        <div className="flex gap-3">
          <div className="h-9 w-24 bg-zinc-200 rounded-lg" />
          <div className="h-9 w-28 bg-zinc-200 rounded-lg" />
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
        {/* Sidebar */}
        <div className="space-y-3">
          <div className="h-12 w-full bg-zinc-200 rounded-xl" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 w-full bg-zinc-200 rounded-lg" />
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-4">
          <div className="h-8 w-48 bg-zinc-200 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 w-full bg-zinc-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
