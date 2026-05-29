import { Card } from "@/components/ui/card";

export function PageSkeleton() {
  return (
    <div className="container-page space-y-6">
      <div className="h-8 bg-zinc-100 rounded animate-pulse w-48" />
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <div className="h-6 bg-zinc-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-zinc-100 rounded animate-pulse w-full" />
              <div className="h-4 bg-zinc-100 rounded animate-pulse w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
