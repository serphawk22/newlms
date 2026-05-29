export function InstructorDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-zinc-200 rounded" />
          <div className="h-4 w-48 bg-zinc-200 rounded" />
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

      {/* Calendar + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 h-72 bg-zinc-200 rounded-xl" />
        <div className="lg:col-span-3 h-72 bg-zinc-200 rounded-xl" />
      </div>

      {/* Banner */}
      <div className="h-28 bg-zinc-200 rounded-xl" />

      {/* Quizzes + Live classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-zinc-200 rounded-xl" />
        <div className="h-64 bg-zinc-200 rounded-xl" />
      </div>
    </div>
  );
}
