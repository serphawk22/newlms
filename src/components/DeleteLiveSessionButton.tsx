"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteLiveSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      const res = await fetch(`/api/instructor/meets/${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      router.refresh();
    } catch (error) {
      alert("Failed to delete class. Please try again.");
    }
  };

  return (
    <Button
      onClick={handleDelete}
      variant="ghost"
      size="sm"
      className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8"
    >
      Delete
    </Button>
  );
}
