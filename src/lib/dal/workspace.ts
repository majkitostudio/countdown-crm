import "server-only";

import { isDemoAuthEnabled } from "@/lib/auth/config";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import type { WorkspaceRole } from "@/lib/auth/roles";

export type { WorkspaceRole } from "@/lib/auth/roles";

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export const DEMO_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Resolves the workspace for a server-side operation. The requested ID is
 * never trusted on its own; membership is always checked in the database.
 */
export async function requireWorkspaceContext(
  requestedWorkspaceId?: string
): Promise<WorkspaceContext> {
  const user = await requireAuthenticatedUser();

  if (isDemoAuthEnabled()) {
    return {
      userId: user.id,
      workspaceId: DEMO_WORKSPACE_ID,
      role: "administrator",
    };
  }

  if (requestedWorkspaceId && !isUuid(requestedWorkspaceId)) {
    throw new DataAccessError("VALIDATION", "Invalid workspace ID");
  }

  const supabase = await createDataClient();
  let query = supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role")
    .eq("user_id", user.id);

  if (requestedWorkspaceId) {
    query = query.eq("workspace_id", requestedWorkspaceId);
  }

  const { data, error } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Workspace membership lookup failed");
  }

  if (!data) {
    throw new DataAccessError("FORBIDDEN", "User is not a member of this workspace");
  }

  return {
    userId: data.user_id,
    workspaceId: data.workspace_id,
    role: data.role,
  };
}

export async function requireWorkspaceRole(
  allowedRoles: readonly WorkspaceRole[],
  requestedWorkspaceId?: string
): Promise<WorkspaceContext> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);

  if (!allowedRoles.includes(context.role)) {
    throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
  }

  return context;
}
