import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/AccessDenied";
import { getInstructorOrgContext } from "./_lib";

export default async function ReportsPage() {
  const { role } = await getInstructorOrgContext();
  if (role !== "ADMIN") {
    return (
      <AccessDenied
        title="Admin Access Required"
        description="This section is only available to administrators"
        buttonLabel="Go back"
        buttonHref="/instructor"
      />
    );
  }
  redirect("/instructor/reports/overview");
}
