import "server-only";

import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import { listQueueItemsForWorkspace, type QueueItemDTO } from "@/lib/dal/leadQueue";
import { listWorkspaceMembers, listWorkspaceOperators, type WorkspaceMemberDTO } from "@/lib/dal/memberships";
import { listAccessibleTeams, listTeamMemberships, type TeamDTO, type TeamMembershipDTO } from "@/lib/dal/teams";
import { listOperatorPresenceForWorkspace, type OperatorPresenceDTO } from "@/lib/dal/operatorPresence";
import { DataAccessError, isDataAccessError } from "@/lib/dal/errors";
import type { WorkspaceContext } from "@/lib/dal/workspace";

export type TeamSource<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; reason: "database" | "provider" };

export interface TeamRosterData {
  teams: TeamDTO[];
  memberships: Record<string, TeamMembershipDTO[]>;
}

export interface TeamPageData {
  queue: TeamSource<QueueItemDTO[]>;
  operators: TeamSource<WorkspaceMemberDTO[]>;
  presence: TeamSource<OperatorPresenceDTO[]>;
  roster: TeamSource<TeamRosterData>;
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

async function loadTeamRoster(workspaceId: string): Promise<TeamRosterData> {
  const teams = await listAccessibleTeams(workspaceId);
  const membershipEntries = await Promise.all(
    teams.map(async (team) => [team.id, await listTeamMemberships(team.id, workspaceId)] as const),
  );

  return {
    teams,
    memberships: Object.fromEntries(membershipEntries),
  };
}

export async function loadTeamPageData(context: WorkspaceContext): Promise<TeamPageData> {
  if (!isTeamLeaderOrAdministrator(context.role)) {
    throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
  }

  if (context.role === "administrator") {
    const [queue, operators, presence, roster, members] = await Promise.allSettled([
      listQueueItemsForWorkspace(context.workspaceId),
      listWorkspaceOperators(context.workspaceId),
      listOperatorPresenceForWorkspace(context.workspaceId),
      loadTeamRoster(context.workspaceId),
      listWorkspaceMembers(context.workspaceId),
    ]);

    return {
      queue: toTeamSource(queue),
      operators: toTeamSource(operators),
      presence: toTeamSource(presence),
      roster: toTeamSource(roster),
      members: toTeamSource(members),
    };
  }

  const [queue, operators, presence, roster] = await Promise.allSettled([
    listQueueItemsForWorkspace(context.workspaceId),
    listWorkspaceOperators(context.workspaceId),
    listOperatorPresenceForWorkspace(context.workspaceId),
    loadTeamRoster(context.workspaceId),
  ]);

  return {
    queue: toTeamSource(queue),
    operators: toTeamSource(operators),
    presence: toTeamSource(presence),
    roster: toTeamSource(roster),
    members: null,
  };
}
