import BarsLoader from "@/components/ui/bars-loader";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";

export default function ProfileLoading() {
  return (
    <div className="bg-zinc-50 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <BarsLoader size="lg" />
        <BarsLoader size="lg" />
      <ProfileSkeleton />
    </div>
  );
}
