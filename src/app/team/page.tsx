import { LockKeyhole, Users } from "lucide-react";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { TeamPageContent } from "@/components/team/TeamPageContent";
import { loadTeamPageData } from "@/lib/dal/teamPage";
import { PageHeader } from "@/components/layout/PageHeader";

function TeamUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
      <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
      <h1 className="text-base font-semibold text-zinc-100">Team operations unavailable</h1>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
    </div>
  );
}

export default async function TeamPage() {
  const context = await requireWorkspaceContext();

  if (context.role !== "team_leader" && context.role !== "administrator") {
    return <TeamUnavailable message="Queue operations are available to Team Leaders and Administrators only." />;
  }

  const data = await loadTeamPageData(context);

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={Users}
        title="Workspace Members & Queue"
        description="Manage workspace queue operations and membership access for the current workspace."
        badge={{ label: context.role === "administrator" ? "Administrator access" : "Team Leader access", tone: "neutral" }}
      />
      <TeamPageContent currentUserId={context.userId} role={context.role} data={data} />
    </div>
  );
}
