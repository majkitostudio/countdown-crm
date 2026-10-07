import "server-only";

import type { Database } from "@/lib/supabase/types";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { isDemoAuthEnabled } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceRole } from "./workspace";

const DEMO_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

type MembershipRow = Database["public"]["Tables"]["workspace_members"]["Row"];
type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email" | "avatar_url"
>;

export interface InviteOrProvisionMemberInput {
  email: string;
  fullName: string;
  role: WorkspaceRole;
  teamId?: string | null;
  deliveryMethod?: "invite" | "password";
  password?: string;
}

export interface InviteOrProvisionMemberResult {
  action: "invited" | "created" | "attached";
  member: WorkspaceMemberDTO;
  assignedTeamId: string | null;
}

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

const DEMO_MEMBERS: WorkspaceMemberDTO[] = [
  {
    workspace_id: DEMO_WORKSPACE_ID,
    user_id: "demo-user",
    role: "administrator",
    full_name: "Demo Administrátor",
    email: "admin@countdowncrm.local",
    avatar_url: null,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    workspace_id: DEMO_WORKSPACE_ID,
    user_id: "demo-tl-1",
    role: "team_leader",
    full_name: "Jan Manažer (TL)",
    email: "tl@countdowncrm.local",
    avatar_url: null,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    workspace_id: DEMO_WORKSPACE_ID,
    user_id: "demo-op-1",
    role: "operator",
    full_name: "Jan Kačmář",
    email: "countdown@majkito.com",
    avatar_url: null,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    workspace_id: DEMO_WORKSPACE_ID,
    user_id: "demo-op-2",
    role: "operator",
    full_name: "Lucie Nováková",
    email: "lucie.novakova@countdowncrm.local",
    avatar_url: null,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
];

export async function listWorkspaceMembers(requestedWorkspaceId?: string): Promise<WorkspaceMemberDTO[]> {
  if (isDemoAuthEnabled()) {
    return DEMO_MEMBERS;
  }

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
  if (isDemoAuthEnabled()) {
    return DEMO_MEMBERS.filter((m) => m.role === "operator");
  }

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

export async function inviteOrProvisionWorkspaceMember(
  input: InviteOrProvisionMemberInput,
  requestedWorkspaceId?: string,
): Promise<InviteOrProvisionMemberResult> {
  const context = await requireWorkspaceRole(["administrator"], requestedWorkspaceId);

  const email = (input.email || "").trim().toLowerCase();
  const fullName = (input.fullName || "").trim();
  const role = input.role;
  const deliveryMethod = input.deliveryMethod || "invite";
  const password = input.password?.trim();
  const teamId = input.teamId?.trim() || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DataAccessError("VALIDATION", "Zadejte platnou e-mailovou adresu.");
  }
  if (!fullName || fullName.length < 2 || fullName.length > 100) {
    throw new DataAccessError("VALIDATION", "Jméno a příjmení musí mít 2 až 100 znaků.");
  }
  if (!["operator", "team_leader", "administrator"].includes(role)) {
    throw new DataAccessError("VALIDATION", "Zvolte platnou roli v CRM.");
  }
  if (deliveryMethod === "password" && (!password || password.length < 8)) {
    throw new DataAccessError("VALIDATION", "Heslo musí obsahovat alespoň 8 znaků.");
  }

  // Demo mode fallback / simulation
  if (isDemoAuthEnabled()) {
    const demoUserId = `simulated-${Date.now()}`;
    const simulatedMember: WorkspaceMemberDTO = {
      workspace_id: context.workspaceId,
      user_id: demoUserId,
      role,
      full_name: fullName,
      email,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return {
      action: deliveryMethod === "password" ? "created" : "invited",
      member: simulatedMember,
      assignedTeamId: teamId,
    };
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    throw new DataAccessError("DATABASE", err instanceof Error ? err.message : "Správa účtů není dostupná.");
  }

  let userId: string | null = null;
  let action: "invited" | "created" | "attached" = "invited";

  try {
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (!listError && listData?.users) {
      const existing = listData.users.find((u) => u.email?.toLowerCase() === email);
      if (existing) {
        userId = existing.id;
        action = "attached";
      }
    }
  } catch {
    // Proceed to create/invite if lookup fails
  }

  if (userId) {
    const { data: existingMember, error: existingError } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", context.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new DataAccessError("DATABASE", "Nepodařilo se ověřit stávající členství.");
    }
    if (existingMember) {
      throw new DataAccessError("VALIDATION", "Uživatel s tímto e-mailem již je členem tohoto call centra.");
    }
  } else {
    if (deliveryMethod === "password") {
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: password!,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !createData.user) {
        throw new DataAccessError("VALIDATION", `Nepodařilo se vytvořit uživatele: ${createError?.message || "chyba auth"}`);
      }
      userId = createData.user.id;
      action = "created";
    } else {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
      });
      if (inviteError || !inviteData.user) {
        throw new DataAccessError("VALIDATION", `Nepodařilo se odeslat pozvánku: ${inviteError?.message || "chyba auth"}`);
      }
      userId = inviteData.user.id;
      action = "invited";
    }
  }

  const { error: memberInsertError } = await adminClient.from("workspace_members").insert({
    workspace_id: context.workspaceId,
    user_id: userId,
    role,
  });

  if (memberInsertError) {
    throw new DataAccessError("DATABASE", `Nepodařilo se přiřadit člena do call centra: ${memberInsertError.message}`);
  }

  await adminClient.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role,
      status: "ready",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  let assignedTeamId: string | null = null;
  if (teamId) {
    const { data: team } = await adminClient
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();

    if (team) {
      const membershipRole = role === "team_leader" ? "leader" : "member";
      const { error: teamMembershipError } = await adminClient.from("team_memberships").insert({
        workspace_id: context.workspaceId,
        team_id: team.id,
        user_id: userId,
        membership_role: membershipRole,
        active_from: new Date().toISOString(),
      });
      if (!teamMembershipError) {
        assignedTeamId = team.id;
      }
    }
  }

  const member = await loadMember(context.workspaceId, userId, adminClient as unknown as Awaited<ReturnType<typeof createDataClient>>);
  return { action, member, assignedTeamId };
}
