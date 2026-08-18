import { LockKeyhole } from "lucide-react";
import { listWorkspaceMembers } from "@/lib/dal/memberships";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { isDataAccessError } from "@/lib/dal/errors";
import { TeamMembersPanel } from "@/components/team/TeamMembersPanel";

export default async function TeamPage() {
  let context: Awaited<ReturnType<typeof requireWorkspaceContext>> | null = null;
  let members: Awaited<ReturnType<typeof listWorkspaceMembers>> = [];
  let loadError: unknown = null;

  try {
    [context, members] = await Promise.all([
      requireWorkspaceContext(),
      listWorkspaceMembers(),
    ]);
  } catch (error) {
    loadError = error;
  }

  if (loadError || !context) {
    const message = isDataAccessError(loadError) && loadError.code === "FORBIDDEN"
      ? "Workspace Members is available to Administrators only."
      : "Workspace members could not be loaded. No data was fabricated.";

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Workspace Members unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
      </div>
    );
  }

  return <TeamMembersPanel initialMembers={members} currentUserId={context.userId} />;
}
