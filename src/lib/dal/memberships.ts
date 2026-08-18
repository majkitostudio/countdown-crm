import "server-only";

import type { Database } from "@/lib/supabase/types";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceRole } from "./workspace";

type MembershipRow = Database["public"]["Tables"]["workspace_members"]["Row"];

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

export async function listWorkspaceMembers(): Promise<WorkspaceMemberDTO[]> {
  const context = await requireWorkspaceRole(["administrator"]);
  const supabase = await createDataClient();
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role, created_at, updated_at")
    .eq("workspace_id", context.workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DataAccessError("DATABASE", "Workspace members could not be loaded");
  }

  return Promise.all(
    ((memberships || []) as MembershipRow[]).map((membership) =>
      loadMember(context.workspaceId, membership.user_id, supabase),
    ),
  );
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
