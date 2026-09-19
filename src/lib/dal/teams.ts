import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "./db";
import { DataAccessError } from "./errors";
import { requireWorkspaceRole } from "./workspace";
import { normalizeTeamSlug } from "@/lib/teamModel";

type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
type TeamMembershipRow = Database["public"]["Tables"]["team_memberships"]["Row"];
type TeamStatus = TeamRow["status"];
type TeamMembershipRole = TeamMembershipRow["membership_role"];

type TeamProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email" | "avatar_url"
>;

export type TeamDTO = TeamRow;

export interface TeamMembershipDTO extends TeamMembershipRow {
  full_name: string;
  email: string;
  avatar_url: string | null;
}

function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}


function assertTeamInput(name: string, slug: string): { name: string; slug: string } {
  const normalizedName = normalizeTeamName(name);
  const normalizedSlug = normalizeTeamSlug(slug);

  if (!normalizedName || !normalizedSlug) {
    throw new DataAccessError("VALIDATION", "Team name and slug are required");
  }

  if (normalizedName.length > 120 || normalizedSlug.length > 80) {
    throw new DataAccessError("VALIDATION", "Team name or slug is too long");
  }

  return { name: normalizedName, slug: normalizedSlug };
}

function mapTeamMembership(
  membership: TeamMembershipRow,
  profilesById: Map<string, TeamProfile>,
): TeamMembershipDTO {
  const profile = profilesById.get(membership.user_id);
  return {
    ...membership,
    full_name: profile?.full_name?.trim() || "Unknown user",
    email: profile?.email?.trim() || "",
    avatar_url: profile?.avatar_url || null,
  };
}

export async function listAccessibleTeams(requestedWorkspaceId?: string): Promise<TeamDTO[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, workspace_id, name, slug, status, created_at, updated_at")
    .eq("workspace_id", context.workspaceId)
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new DataAccessError("DATABASE", "Teams could not be loaded");
  }

  return (data || []) as TeamDTO[];
}

const TEAM_SELECT_COLUMNS = "id, workspace_id, name, slug, status, created_at, updated_at";

/**
 * The teams the current user is allowed to work with in the Team Workspace.
 * Administrators may select every active team; a Team Leader only the active
 * teams they lead. This never trusts the client and is the validation set for
 * every team-scoped query.
 */
export async function listSelectableWorkspaceTeams(requestedWorkspaceId?: string): Promise<TeamDTO[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();

  const load = supabase
    .from("teams")
    .select(TEAM_SELECT_COLUMNS)
    .eq("workspace_id", context.workspaceId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (context.role === "administrator") {
    const { data, error } = await load;
    if (error) {
      throw new DataAccessError("DATABASE", "Selectable teams could not be loaded");
    }
    return (data || []) as TeamDTO[];
  }

  const now = Date.now();
  const { data: ledTeams, error: ledTeamsError } = await supabase
    .from("team_memberships")
    .select("team_id, active_from, active_until")
    .eq("workspace_id", context.workspaceId)
    .eq("user_id", context.userId)
    .eq("membership_role", "leader");

  if (ledTeamsError) {
    throw new DataAccessError("DATABASE", "Led teams could not be loaded");
  }

  const teamIds = [...new Set(
    (ledTeams || [])
      .filter((membership) => Date.parse(membership.active_from) <= now && (!membership.active_until || Date.parse(membership.active_until) > now))
      .map((membership) => membership.team_id),
  )];

  if (teamIds.length === 0) return [];
  const { data, error } = await load.in("id", teamIds);
  if (error) {
    throw new DataAccessError("DATABASE", "Selectable teams could not be loaded");
  }
  return (data || []) as TeamDTO[];
}

/**
 * Operator user ids (active operators in the workspace) for a strict subset of
 * selectable teams. Used to scope orders, calls, quality reviews and presence
 * to what a chosen team filter may actually see.
 */
export async function listTeamOperatorIds(
  requestedWorkspaceId: string,
  teamIds: string[],
): Promise<string[]> {
  if (teamIds.length === 0) return [];
  const context = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();

  const now = Date.now();
  const [teamMemberships, workspaceOperators] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("user_id, active_from, active_until")
      .eq("workspace_id", context.workspaceId)
      .eq("membership_role", "member")
      .in("team_id", teamIds),
    supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", context.workspaceId)
      .eq("role", "operator"),
  ]);

  if (teamMemberships.error || workspaceOperators.error) {
    throw new DataAccessError("DATABASE", "Team operators could not be loaded");
  }

  const operatorIds = new Set((workspaceOperators.data || []).map((membership) => membership.user_id));
  return [...new Set(
    (teamMemberships.data || [])
      .filter((membership) => Date.parse(membership.active_from) <= now && (!membership.active_until || Date.parse(membership.active_until) > now))
      .map((membership) => membership.user_id)
      .filter((userId) => operatorIds.has(userId)),
  )];
}

export async function listTeamMemberships(
  teamId: string,
  requestedWorkspaceId?: string,
): Promise<TeamMembershipDTO[]> {
  if (!teamId.trim()) {
    throw new DataAccessError("VALIDATION", "A team is required");
  }

  const context = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("team_memberships")
    .select("id, team_id, workspace_id, user_id, membership_role, active_from, active_until, created_at, updated_at")
    .eq("team_id", teamId)
    .eq("workspace_id", context.workspaceId)
    .order("membership_role", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new DataAccessError("DATABASE", "Team memberships could not be loaded");
  }

  const memberships = (data || []) as TeamMembershipRow[];
  if (memberships.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", memberships.map((membership) => membership.user_id));

  if (profileError) {
    throw new DataAccessError("DATABASE", "Team member profiles could not be loaded");
  }

  const profilesById = new Map(((profiles || []) as TeamProfile[]).map((profile) => [profile.id, profile]));
  return memberships.map((membership) => mapTeamMembership(membership, profilesById));
}

export async function createTeam(input: {
  name: string;
  slug: string;
  requestedWorkspaceId?: string;
}): Promise<TeamDTO> {
  const context = await requireWorkspaceRole(["administrator"], input.requestedWorkspaceId);
  const values = assertTeamInput(input.name, input.slug);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({ workspace_id: context.workspaceId, ...values })
    .select("id, workspace_id, name, slug, status, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Team could not be created");
  }

  return data as TeamDTO;
}

export async function updateTeam(
  teamId: string,
  input: { name: string; slug: string },
): Promise<TeamDTO> {
  if (!teamId.trim()) {
    throw new DataAccessError("VALIDATION", "A team is required");
  }

  const context = await requireWorkspaceRole(["administrator"]);
  const values = assertTeamInput(input.name, input.slug);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", teamId)
    .eq("workspace_id", context.workspaceId)
    .select("id, workspace_id, name, slug, status, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Team could not be updated");
  }

  return data as TeamDTO;
}

export async function archiveTeam(teamId: string): Promise<TeamDTO> {
  if (!teamId.trim()) {
    throw new DataAccessError("VALIDATION", "A team is required");
  }

  const context = await requireWorkspaceRole(["administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", teamId)
    .eq("workspace_id", context.workspaceId)
    .select("id, workspace_id, name, slug, status, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Team could not be archived");
  }

  return data as TeamDTO;
}

export async function assignTeamMembership(input: {
  teamId: string;
  userId: string;
  membershipRole: TeamMembershipRole;
}): Promise<TeamMembershipDTO> {
  if (!input.teamId.trim() || !input.userId.trim() || !["member", "leader"].includes(input.membershipRole)) {
    throw new DataAccessError("VALIDATION", "Team, user and membership role are required");
  }

  const context = await requireWorkspaceRole(["administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("team_memberships")
    .insert({
      team_id: input.teamId,
      workspace_id: context.workspaceId,
      user_id: input.userId,
      membership_role: input.membershipRole,
    })
    .select("id, team_id, workspace_id, user_id, membership_role, active_from, active_until, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Team membership could not be created");
  }

  const memberships = await listTeamMemberships(input.teamId, context.workspaceId);
  const created = memberships.find((membership) => membership.id === data.id);
  if (!created) {
    throw new DataAccessError("DATABASE", "Created team membership could not be loaded");
  }
  return created;
}

export async function endTeamMembership(membershipId: string): Promise<void> {
  if (!membershipId.trim()) {
    throw new DataAccessError("VALIDATION", "A team membership is required");
  }

  const context = await requireWorkspaceRole(["administrator"]);
  const supabase = await createDataClient();
  const { error } = await supabase
    .from("team_memberships")
    .update({ active_until: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("workspace_id", context.workspaceId)
    .is("active_until", null);

  if (error) {
    throw new DataAccessError("DATABASE", "Team membership could not be ended");
  }
}

export type { TeamStatus, TeamMembershipRole };
