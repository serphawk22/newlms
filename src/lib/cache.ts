import { unstable_cache } from "next/cache";

export const CACHE_TAGS = {
  studentProfile:    "student-profile",
  instructorProfile: "instructor-profile",
  courses:           "courses",
  enrollments:       "enrollments",
  notifications:     "notifications",
  reviews:           "reviews",
  chats:             "chats",
  sharedVideos:      "shared-videos",
  readingMaterials:  "reading-materials",
  meets:             "meets",
  sessions:          "sessions",
} as const;

export function withCache<T>(
  cb: () => Promise<T>,
  tags: string[],
  revalidate = 60,
  userId?: string,
  orgId?: string,
): Promise<T> {
  const keyParts = [...tags];
  if (userId) keyParts.push(`user:${userId}`);
  if (orgId) keyParts.push(`org:${orgId}`);
  return unstable_cache(cb, keyParts, { tags, revalidate })();
}
