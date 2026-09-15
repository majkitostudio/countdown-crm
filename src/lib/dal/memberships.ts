import "server-only";

import type { Database } from "@/lib/supabase/types";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceRole } from "./workspace";

type MembershipRow = Database["public"]["Tables"]["workspace_members"]["Row"];
type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email" | "avatar_url"
>;

export interface WorkspaceMemberDTO {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function mergeMembershipProfiles(
  memberships: MembershipRow[],
  profiles: ProfileRow[],
): WorkspaceMemberDTO[] {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return memberships.map((membership) => {
    const profile = profilesById.get(membership.user_id);

    return {
      ...membership,
      role: membership.role as WorkspaceRole,
      full_name: profile?.full_name?.trim() || "Unknown operator",
      email: profile?.email?.trim() || "",
      avatar_url: profile?.avatar_url || null,
    };
  });
}

async function loadMembershipProfiles(
  memberships: MembershipRow[],
  supabase: Awaited<ReturnType<typeof createDataClient>>,
): Promise<WorkspaceMemberDTO[]> {
  if (memberships.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", memberships.map((membership) => membership.user_id));

  if (profileError) {
    throw new DataAccessError("DATABASE", "Workspace member profiles could not be loaded");
  }

  return mergeMembershipProfiles(memberships, (profiles || []) as ProfileRow[]);
}

async function loadMember(
  workspaceId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createDataClient>>,
): Promise<WorkspaceMemberDTO> {
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new DataAccessError("NOT_FOUND", "Workspace member not found");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new DataAccessError("DATABASE", "Workspace member profile lookup failed");
  }

  return {
    ...(membership as MembershipRow),
    role: membership.role as WorkspaceRole,
    full_name: profile?.full_name?.trim() || "Unknown operator",
    email: profile?.email?.trim() || "",
    avatar_url: profile?.avatar_url || null,
  };
}

export async function listWorkspaceMembers(requestedWorkspaceId?: string): Promise<WorkspaceMemberDTO[]> {
  const context = await requireWorkspaceRole(["administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role, created_at, updated_at")
    .eq("workspace_id", context.workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DataAccessError("DATABASE", "Workspace members could not be loaded");
  }

  return loadMembershipProfiles((memberships || []) as MembershipRow[], supabase);
}

export async function listWorkspaceOperators(requestedWorkspaceId?: string): Promise<WorkspaceMemberDTO[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  let operatorQuery = supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role, created_at, updated_at")
    .eq("workspace_id", context.workspaceId)
    .eq("role", "operator")
    .order("created_at", { ascending: true });

  if (context.role === "team_leader") {
    const now = Date.now();
    const { data: ledTeams, error: ledTeamsError } = await supabase
      .from("team_memberships")
      .select("team_id, active_from, active_until")
      .eq("workspace_id", context.workspaceId)
      .eq("user_id", context.userId)
      .eq("membership_role", "leader");

    if (ledTeamsError) {
      throw new DataAccessError("DATABASE", "Team memberships could not be loaded");
    }

    const candidateTeamIds = (ledTeams || [])
      .filter((membership) => Date.parse(membership.active_from) <= now && (!membership.active_until || Date.parse(membership.active_until) > now))
      .map((membership) => membership.team_id);

    if (candidateTeamIds.length === 0) return [];

    const { data: activeTeams, error: activeTeamsError } = await supabase
      .from("teams")
      .select("id")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .in("id", candidateTeamIds);

    if (activeTeamsError) {
      throw new DataAccessError("DATABASE", "Active teams could not be loaded");
    }

    const teamIds = (activeTeams || []).map((team) => team.id);
    if (teamIds.length === 0) return [];

    const { data: teamOperators, error: teamOperatorsError } = await supabase
      .from("team_memberships")
      .select("user_id, active_from, active_until")
      .eq("workspace_id", context.workspaceId)
      .eq("membership_role", "member")
      .in("team_id", teamIds);

    if (teamOperatorsError) {
      throw new DataAccessError("DATABASE", "Team operators could not be loaded");
    }

    const operatorIds = [...new Set(
      (teamOperators || [])
        .filter((membership) => Date.parse(membership.active_from) <= now && (!membership.active_until || Date.parse(membership.active_until) > now))
        .map((membership) => membership.user_id),
    )];

    if (operatorIds.length === 0) return [];
    operatorQuery = operatorQuery.in("user_id", operatorIds);
  }

  const { data: memberships, error } = await operatorQuery;
  if (error) {
    throw new DataAccessError("DATABASE", "Workspace operators could not be loaded");
  }

  return loadMembershipProfiles((memberships || []) as MembershipRow[], supabase);
}

export async function updateWorkspaceMemberRole(
  userId: string,
  role: WorkspaceRole,
): Promise<WorkspaceMemberDTO> {
  const context = await requireWorkspaceRole(["administrator"]);
  if (!userId.trim() || !["operator", "team_leader", "administrator"].includes(role)) {
    throw new DataAccessError("VALIDATION", "A valid member and role are required");
  }

  if (userId === context.userId && role !== "administrator") {
    throw new DataAccessError("FORBIDDEN", "The last active administrator cannot demote themselves");
  }

  const supabase = await createDataClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", context.workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new DataAccessError("DATABASE", "Workspace member role could not be changed");
  }

  return loadMember(context.workspaceId, userId, supabase);
}

export async function deleteWorkspaceMember(userId: string): Promise<void> {
  const context = await requireWorkspaceRole(["administrator"]);
  if (!userId.trim() || userId === context.userId) {
    throw new DataAccessError("FORBIDDEN", "The active administrator cannot remove themselves");
  }

  const supabase = await createDataClient();
  const { data: target, error: targetError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", context.workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (targetError || !target) {
    throw new DataAccessError("NOT_FOUND", "Workspace member not found");
  }

  if (target.role === "administrator") {
    const { count, error: countError } = await supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", context.workspaceId)
      .eq("role", "administrator");

    if (countError) {
      throw new DataAccessError("DATABASE", "Administrator count could not be verified");
    }
    if ((count || 0) <= 1) {
      throw new DataAccessError("FORBIDDEN", "The workspace must retain at least one administrator");
    }
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", context.workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new DataAccessError("DATABASE", "Workspace member could not be removed");
  }
}
