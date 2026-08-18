import { LockKeyhole } from "lucide-react";
import { listWorkspaceMembers, listWorkspaceOperators } from "@/lib/dal/memberships";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { isDataAccessError } from "@/lib/dal/errors";
import { TeamMembersPanel } from "@/components/team/TeamMembersPanel";
import { TeamQueuePanel } from "@/components/team/TeamQueuePanel";
import { listQueueItemsForWorkspace } from "@/lib/dal/leadQueue";
import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";

export default async function TeamPage() {
  let context: Awaited<ReturnType<typeof requireWorkspaceContext>> | null = null;
  let members: Awaited<ReturnType<typeof listWorkspaceMembers>> = [];
  let operators: Awaited<ReturnType<typeof listWorkspaceOperators>> = [];
  let queueItems: Awaited<ReturnType<typeof listQueueItemsForWorkspace>> = [];
  let loadError: unknown = null;

  try {
    context = await requireWorkspaceContext();
    if (isTeamLeaderOrAdministrator(context.role)) {
      [queueItems, operators] = await Promise.all([
        listQueueItemsForWorkspace(context.workspaceId),
        listWorkspaceOperators(),
      ]);
      if (context.role === "administrator") {
        members = await listWorkspaceMembers();
      }
    }
  } catch (error) {
    loadError = error;
  }

  if (loadError || !context || !isTeamLeaderOrAdministrator(context.role)) {
    const message = !context || !isTeamLeaderOrAdministrator(context?.role)
      ? "Queue operations are available to Team Leaders and Administrators only."
      : isDataAccessError(loadError) && loadError.code === "FORBIDDEN"
        ? "Queue operations are available to Team Leaders and Administrators only."
        : "Team operations could not be loaded. No data was fabricated.";

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Team operations unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <TeamQueuePanel initialQueueItems={queueItems} operators={operators} />
      {context.role === "administrator" && <TeamMembersPanel initialMembers={members} currentUserId={context.userId} />}
    </div>
  );
}
