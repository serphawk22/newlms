"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";

export interface PendingUserItem {
  id: string;
  name: string | null;
  email: string;
  role: "STUDENT" | "INSTRUCTOR";
}

interface Props {
  users: PendingUserItem[];
  totalPending: number;
}

export function PendingRequestsCard({ users, totalPending }: Props) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (userId: string, action: "ACTIVE" | "REJECTED") => {
    setActionLoading(userId);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      router.refresh();
    } catch {
      // ignore
    }
    setActionLoading(null);
  };

  if (totalPending === 0) return null;

  return (
    <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold" style={{ color: "var(--foreground)" }}>
          Pending Requests
        </CardTitle>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
          style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}
        >
          {totalPending} pending
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: "var(--secondary-background)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
                  style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A" }}
                >
                  {(u.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {u.name || "Unnamed"}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    {u.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                  style={{ background: "rgba(217,37,42,0.12)", color: "#D9252A", border: "1px solid rgba(217,37,42,0.25)" }}
                >
                  {u.role.toLowerCase()}
                </span>
                <button
                  onClick={() => handleAction(u.id, "ACTIVE")}
                  disabled={actionLoading === u.id}
                  className="px-3 py-1.5 text-[11px] font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: "#D9252A" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#EF4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#D9252A")}
                >
                  {actionLoading === u.id ? <Loader size="sm" variant="bars" /> : "Approve"}
                </button>
                <button
                  onClick={() => handleAction(u.id, "REJECTED")}
                  disabled={actionLoading === u.id}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
