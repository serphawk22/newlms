export function StudentDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-zinc-200 rounded" />
          <div className="h-4 w-40 bg-zinc-200 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-64 bg-zinc-200 rounded-xl hidden sm:block" />
          <div className="h-9 w-9 bg-zinc-200 rounded-xl" />
          <div className="h-9 w-9 bg-zinc-200 rounded-full" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-zinc-200 rounded-xl" />
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="h-4 w-24 bg-zinc-200 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-200 rounded-xl" />
          ))}
        </div>
        <div className="space-y-6">
          <div className="h-4 w-20 bg-zinc-200 rounded" />
          <div className="h-64 bg-zinc-200 rounded-xl" />
        </div>
      </div>

      {/* Activity */}
      <div className="h-4 w-24 bg-zinc-200 rounded" />
      <div className="h-48 bg-zinc-200 rounded-xl" />
    </div>
  );
}
