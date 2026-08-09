import "server-only";

import { isDemoAuthEnabled } from "@/lib/auth/config";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type WorkspaceRole = Database["public"]["Tables"]["workspace_members"]["Row"]["role"];
export type WorkspaceMembership =
  Database["public"]["Tables"]["workspace_members"]["Row"];

export async function getCurrentWorkspaceMembership(
  workspaceId: string
): Promise<WorkspaceMembership | null> {
  const user = await requireAuthenticatedUser();

  if (isDemoAuthEnabled()) {
    return {
      workspace_id: workspaceId,
      user_id: user.id,
      role: "admin",
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Workspace membership lookup failed");
  }

  return data;
}

export async function requireWorkspaceRole(
  workspaceId: string,
  allowedRoles: readonly WorkspaceRole[]
): Promise<WorkspaceMembership> {
  const membership = await getCurrentWorkspaceMembership(workspaceId);

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error("Forbidden");
  }

  return membership;
}
