import "server-only";

import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import { listQueueItemsForWorkspace, type QueueItemDTO } from "@/lib/dal/leadQueue";
import { listWorkspaceMembers, listWorkspaceOperators, type WorkspaceMemberDTO } from "@/lib/dal/memberships";
import { listAccessibleTeams, listTeamMemberships, type TeamDTO, type TeamMembershipDTO } from "@/lib/dal/teams";
import { listOperatorPresenceForWorkspace, type OperatorPresenceDTO } from "@/lib/dal/operatorPresence";
import { DataAccessError, isDataAccessError } from "@/lib/dal/errors";
import type { WorkspaceContext } from "@/lib/dal/workspace";
import { loadTeamWorkspaceCheckpoint, type TeamWorkspaceCheckpoint } from "@/lib/dal/teamWorkspace";
import { listCallQualityReviewsForWorkspace, type CallQualityReviewDTO } from "@/lib/dal/callQualityReviews";
import { listAssistanceRequestsForWorkspace, type AssistanceRequestDTO } from "@/lib/dal/assistanceRequests";

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
  checkpoint: TeamSource<TeamWorkspaceCheckpoint>;
  qualityReviews: TeamSource<CallQualityReviewDTO[]>;
  assistanceRequests?: TeamSource<AssistanceRequestDTO[]>;
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
    const [queue, operators, presence, roster, members, checkpoint, qualityReviews, assistanceRequests] = await Promise.allSettled([
      listQueueItemsForWorkspace(context.workspaceId),
      listWorkspaceOperators(context.workspaceId),
      listOperatorPresenceForWorkspace(context.workspaceId),
      loadTeamRoster(context.workspaceId),
      listWorkspaceMembers(context.workspaceId),
      loadTeamWorkspaceCheckpoint(context),
      listCallQualityReviewsForWorkspace(context.workspaceId),
      listAssistanceRequestsForWorkspace(),
    ]);

    return {
      queue: toTeamSource(queue),
      operators: toTeamSource(operators),
      presence: toTeamSource(presence),
      roster: toTeamSource(roster),
      members: toTeamSource(members),
      checkpoint: toTeamSource(checkpoint),
      qualityReviews: toTeamSource(qualityReviews),
      assistanceRequests: toTeamSource(assistanceRequests),
    };
  }

  const [queue, operators, presence, roster, checkpoint, qualityReviews, assistanceRequests] = await Promise.allSettled([
    listQueueItemsForWorkspace(context.workspaceId),
    listWorkspaceOperators(context.workspaceId),
    listOperatorPresenceForWorkspace(context.workspaceId),
    loadTeamRoster(context.workspaceId),
    loadTeamWorkspaceCheckpoint(context),
    listCallQualityReviewsForWorkspace(context.workspaceId),
    listAssistanceRequestsForWorkspace(),
  ]);

  return {
    queue: toTeamSource(queue),
    operators: toTeamSource(operators),
    presence: toTeamSource(presence),
    roster: toTeamSource(roster),
    members: null,
    checkpoint: toTeamSource(checkpoint),
    qualityReviews: toTeamSource(qualityReviews),
    assistanceRequests: toTeamSource(assistanceRequests),
  };
}
