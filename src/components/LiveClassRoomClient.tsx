"use client";

/**
 * LiveClassRoomClient
 *
 * Thin "use client" wrapper so that `ssr: false` can be used with next/dynamic.
 * next/dynamic's `ssr: false` is only allowed inside Client Components.
 * The meet/[roomId]/page.tsx server component imports THIS wrapper instead of
 * LiveClassRoom directly, which prevents ZEGOCLOUD from running server-side
 * and fixes the "Cannot read properties of null (reading 'createSpan')" crash.
 */

import dynamic from "next/dynamic";
import { RingLoader } from "@/components/ui/ring-loader";

const LiveClassRoom = dynamic(() => import("@/components/LiveClassRoom"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <RingLoader size="lg" label="Connecting to live classroom…" />
    </div>
  ),
});

// Re-export identical props shape so the server page stays typed
export type { } from "@/components/LiveClassRoom";

export default function LiveClassRoomClient(
  props: React.ComponentProps<typeof LiveClassRoom>
) {
  return <LiveClassRoom {...props} />;
}
