import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export interface StudentAnalyticsData {
  total: number;
  active: number;
  recentlyJoined: { id: string; name: string; email: string }[];
}

export function AdminStudentSection({ data }: { data: StudentAnalyticsData }) {
  return (
    <Card style={{ border: "1px solid var(--border)", background: "var(--card)", boxShadow: "none" }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold" style={{ color: "var(--foreground)" }}>
          Student Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Summary mini-cards */}
          <div className="flex flex-col gap-3">
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
            >

              <div>
                <div className="text-2xl font-black" style={{ color: "var(--foreground)" }}>{data.total}</div>
                <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Total Students</div>
              </div>
            </div>
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
            >

              <div>
                <div className="text-2xl font-black" style={{ color: "var(--foreground)" }}>{data.active}</div>
                <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Active (Enrolled)</div>
              </div>
            </div>
          </div>

          {/* Recently joined table — spans 2 cols */}
          <div className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: "var(--muted-foreground)" }}>Recently Joined Students</span>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {data.recentlyJoined.length === 0 ? (
                <div className="text-center py-6 text-xs" style={{ color: "var(--muted-foreground)" }}>No students yet</div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] whitespace-nowrap text-sm">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left py-2.5 px-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Name</th>
                      <th className="text-left py-2.5 px-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentlyJoined.map((s) => (
                      <tr
                        key={s.id}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td className="py-2.5 px-4 font-medium" style={{ color: "var(--foreground)" }}>{s.name}</td>
                        <td className="py-2.5 px-4 text-xs" style={{ color: "var(--muted-foreground)" }}>{s.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
