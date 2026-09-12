import { LockKeyhole, Users } from "lucide-react";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { TeamPageContent } from "@/components/team/TeamPageContent";
import { loadTeamPageData } from "@/lib/dal/teamPage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";

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

<<<<<<< HEAD
  if (loadError || !context || !isTeamLeaderOrAdministrator(context.role)) {
    const message = !context || !isTeamLeaderOrAdministrator(context?.role)
      ? "Queue operations are available to Team Leaders and Administrators only."
      : isDataAccessError(loadError) && loadError.code === "FORBIDDEN"
        ? "Queue operations are available to Team Leaders and Administrators only."
        : "Team operations could not be loaded. No data was fabricated.";

    return (
      <div className="mx-auto max-w-xl">
      <Surface variant="empty">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Team operations unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
      </Surface>
      </div>
    );
  }
=======
  const data = await loadTeamPageData(context);
>>>>>>> origin/main

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
