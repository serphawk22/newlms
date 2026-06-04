import { RingLoader } from "@/components/ui/ring-loader";

interface PageLoaderProps {
  label?: string;
}

/** Centered full-area loader for Next.js `loading.tsx` route segments. */
export function PageLoader({ label }: PageLoaderProps) {
  return (
    <div
      className="min-h-[50vh] w-full flex items-center justify-center p-8"
      style={{ background: "var(--background)" }}
    >
      <RingLoader size="lg" label={label} />
    </div>
  );
}

export default PageLoader;
