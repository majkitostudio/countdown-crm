"use server";

import { listWorkspaceMembers, type WorkspaceMemberDTO } from "@/lib/dal/memberships";
import {
  assignTeamOwnership,
  listTeamOwnershipRecords,
  type TeamOwnershipAssignmentResult,
  type TeamOwnershipData,
  type TeamOwnershipResourceType,
} from "@/lib/dal/teamOwnership";
import {
  assignTeamMembership,
  createTeam,
  endTeamMembership,
  listAccessibleTeams,
  listTeamMemberships,
  type TeamDTO,
  type TeamMembershipDTO,
} from "@/lib/dal/teams";

export interface TeamManagementData {
  teams: TeamDTO[];
  members: WorkspaceMemberDTO[];
  memberships: Record<string, TeamMembershipDTO[]>;
  ownership: TeamOwnershipData;
}

export async function loadTeamManagementAction(): Promise<TeamManagementData> {
  const [teams, members, ownership] = await Promise.all([
    listAccessibleTeams(),
    listWorkspaceMembers(),
    listTeamOwnershipRecords(),
  ]);

  const membershipEntries = await Promise.all(
    teams.map(async (team) => [team.id, await listTeamMemberships(team.id)] as const),
  );

  return {
    teams,
    members,
    memberships: Object.fromEntries(membershipEntries),
    ownership,
  };
}

export async function createTeamAction(name: string, slug: string): Promise<TeamDTO> {
  return createTeam({ name, slug });
}

export async function assignTeamMembershipAction(
  teamId: string,
  userId: string,
  membershipRole: "member" | "leader",
): Promise<TeamMembershipDTO> {
  return assignTeamMembership({ teamId, userId, membershipRole });
}

export async function endTeamMembershipAction(membershipId: string): Promise<void> {
  return endTeamMembership(membershipId);
}

export async function assignTeamOwnershipAction(
  resourceType: TeamOwnershipResourceType,
  resourceId: string,
  teamId: string | null,
): Promise<TeamOwnershipAssignmentResult> {
  return assignTeamOwnership({ resourceType, resourceId, teamId });
}
