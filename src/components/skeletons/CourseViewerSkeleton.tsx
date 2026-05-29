export function CourseViewerSkeleton() {
  return (
    <div className="container-page space-y-8">
      <div className="h-8 w-96 bg-zinc-200 rounded animate-pulse" />
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-zinc-200 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="md:col-span-3 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-zinc-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
