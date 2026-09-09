import "server-only";

import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import { listQueueItemsForWorkspace, type QueueItemDTO } from "@/lib/dal/leadQueue";
import { listWorkspaceMembers, listWorkspaceOperators, type WorkspaceMemberDTO } from "@/lib/dal/memberships";
import { DataAccessError, isDataAccessError } from "@/lib/dal/errors";
import type { WorkspaceContext } from "@/lib/dal/workspace";

export type TeamSource<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; reason: "database" | "provider" };

export interface TeamPageData {
  queue: TeamSource<QueueItemDTO[]>;
  operators: TeamSource<WorkspaceMemberDTO[]>;
  members: TeamSource<WorkspaceMemberDTO[]> | null;
}

function toTeamSource<T>(result: PromiseSettledResult<T>): TeamSource<T> {
  if (result.status === "fulfilled") {
    return { status: "ready", data: result.value };
  }

  if (isDataAccessError(result.reason) && result.reason.code === "DATABASE") {
    return { status: "unavailable", reason: "database" };
  }

  throw result.reason;
}

export async function loadTeamPageData(context: WorkspaceContext): Promise<TeamPageData> {
  if (!isTeamLeaderOrAdministrator(context.role)) {
    throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
  }

  if (context.role === "administrator") {
    const [queue, operators, members] = await Promise.allSettled([
      listQueueItemsForWorkspace(context.workspaceId),
      listWorkspaceOperators(context.workspaceId),
      listWorkspaceMembers(context.workspaceId),
    ]);

    return {
      queue: toTeamSource(queue),
      operators: toTeamSource(operators),
      members: toTeamSource(members),
    };
  }

  const [queue, operators] = await Promise.allSettled([
    listQueueItemsForWorkspace(context.workspaceId),
    listWorkspaceOperators(context.workspaceId),
  ]);

  return {
    queue: toTeamSource(queue),
    operators: toTeamSource(operators),
    members: null,
  };
}
