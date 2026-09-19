import "server-only";

import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import { listQueueItemsForWorkspace, type QueueItemDTO } from "@/lib/dal/leadQueue";
import { listWorkspaceMembers, listWorkspaceOperators, type WorkspaceMemberDTO } from "@/lib/dal/memberships";
import { listAccessibleTeams, listSelectableWorkspaceTeams, listTeamMemberships, listTeamOperatorIds, type TeamDTO, type TeamMembershipDTO } from "@/lib/dal/teams";
import { listOperatorPresenceForWorkspace, type OperatorPresenceDTO } from "@/lib/dal/operatorPresence";
import { DataAccessError, isDataAccessError } from "@/lib/dal/errors";
import type { WorkspaceContext } from "@/lib/dal/workspace";
import { loadTeamWorkspaceCheckpoint, type TeamWorkspaceCheckpoint } from "@/lib/dal/teamWorkspace";
import { listCallQualityReviewsForWorkspace, type CallQualityReviewDTO } from "@/lib/dal/callQualityReviews";
import { listAssistanceRequestsForWorkspace, type AssistanceRequestDTO } from "@/lib/dal/assistanceRequests";
import {
  isTeamWorkspacePeriodKey,
  type TeamWorkspacePeriodKey,
  type TeamWorkspaceScopeInput,
} from "@/lib/teamWorkspaceScope";

export type TeamSource<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; reason: "database" | "provider" };

export interface TeamRosterData {
  teams: TeamDTO[];
  memberships: Record<string, TeamMembershipDTO[]>;
}

export interface TeamPageScopeMetadata {
  periodKey: TeamWorkspacePeriodKey;
  /** Applied team filter; an empty array means every selectable team. */
  teamIds: string[];
  selectableTeams: Array<{ id: string; name: string }>;
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
  scope: TeamPageScopeMetadata;
}

interface ResolvedTeamWorkspaceScope {
  periodKey: TeamWorkspacePeriodKey;
  teamIds: string[];
  operatorIds: string[];
  selectableTeams: TeamDTO[];
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

async function resolveTeamWorkspaceScope(
  context: WorkspaceContext,
  input: TeamWorkspaceScopeInput | undefined,
): Promise<ResolvedTeamWorkspaceScope> {
  const periodKey = input?.periodKey && isTeamWorkspacePeriodKey(input.periodKey) ? input.periodKey : "today";

  let selectableTeams: TeamDTO[] = [];
  try {
    selectableTeams = await listSelectableWorkspaceTeams(context.workspaceId);
  } catch (error) {
    if (!isDataAccessError(error) || error.code !== "DATABASE") throw error;
  }

  const selectableIds = new Set(selectableTeams.map((team) => team.id));
  const requestedTeamIds = Array.from(new Set((input?.teamIds || []).filter((id): id is string => Boolean(id))));
  if (requestedTeamIds.some((id) => !selectableIds.has(id))) {
    throw new DataAccessError("VALIDATION", "A selected team is not within the accessible team scope.");
  }

  const appliedTeamIds = requestedTeamIds.length > 0 ? requestedTeamIds : selectableTeams.map((team) => team.id);
  const isStrictSubset = requestedTeamIds.length > 0 && requestedTeamIds.length < selectableTeams.length;
  const operatorIds = isStrictSubset ? await listTeamOperatorIds(context.workspaceId, appliedTeamIds) : [];

  return { periodKey, teamIds: appliedTeamIds, operatorIds, selectableTeams };
}

async function loadScopedOperators(
  context: WorkspaceContext,
  operatorIds: string[],
): Promise<WorkspaceMemberDTO[]> {
  const operators = await listWorkspaceOperators(context.workspaceId);
  if (operatorIds.length === 0) return operators;
  const allowed = new Set(operatorIds);
  return operators.filter((operator) => allowed.has(operator.user_id));
}

async function loadTeamRoster(workspaceId: string, teamIds: string[]): Promise<TeamRosterData> {
  const teams = await listAccessibleTeams(workspaceId);
  const visibleTeams = teamIds.length > 0 ? teams.filter((team) => teamIds.includes(team.id)) : teams;
  const membershipEntries = await Promise.all(
    visibleTeams.map(async (team) => [team.id, await listTeamMemberships(team.id, workspaceId)] as const),
  );

  return {
    teams: visibleTeams,
    memberships: Object.fromEntries(membershipEntries),
  };
}

export async function loadTeamPageData(
  context: WorkspaceContext,
  scopeInput?: TeamWorkspaceScopeInput,
): Promise<TeamPageData> {
  if (!isTeamLeaderOrAdministrator(context.role)) {
    throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
  }

  const scope = await resolveTeamWorkspaceScope(context, scopeInput);
  const checkpointOptions = { periodKey: scope.periodKey, operatorIds: scope.operatorIds };
  const queueOptions = scope.teamIds.length > 0 ? { teamIds: scope.teamIds } : {};
  const operationOptions = scope.operatorIds.length > 0 ? { operatorIds: scope.operatorIds } : {};

  if (context.role === "administrator") {
    const [queue, operators, presence, roster, members, checkpoint, qualityReviews, assistanceRequests] = await Promise.allSettled([
      listQueueItemsForWorkspace(context.workspaceId, queueOptions),
      loadScopedOperators(context, scope.operatorIds),
      listOperatorPresenceForWorkspace(context.workspaceId, operationOptions),
      loadTeamRoster(context.workspaceId, scope.teamIds),
      listWorkspaceMembers(context.workspaceId),
      loadTeamWorkspaceCheckpoint(context, checkpointOptions),
      listCallQualityReviewsForWorkspace(context.workspaceId, operationOptions),
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
      scope: {
        periodKey: scope.periodKey,
        teamIds: scope.teamIds,
        selectableTeams: scope.selectableTeams.map((team) => ({ id: team.id, name: team.name })),
      },
    };
  }

  const [queue, operators, presence, roster, checkpoint, qualityReviews, assistanceRequests] = await Promise.allSettled([
    listQueueItemsForWorkspace(context.workspaceId, queueOptions),
    loadScopedOperators(context, scope.operatorIds),
    listOperatorPresenceForWorkspace(context.workspaceId, operationOptions),
    loadTeamRoster(context.workspaceId, scope.teamIds),
    loadTeamWorkspaceCheckpoint(context, checkpointOptions),
    listCallQualityReviewsForWorkspace(context.workspaceId, operationOptions),
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
    scope: {
      periodKey: scope.periodKey,
      teamIds: scope.teamIds,
      selectableTeams: scope.selectableTeams.map((team) => ({ id: team.id, name: team.name })),
    },
  };
}
