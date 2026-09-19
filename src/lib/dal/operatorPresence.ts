import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "./db";
import { DataAccessError } from "./errors";
import { requireWorkspaceRole } from "./workspace";

export type OperatorPresenceState = Database["public"]["Tables"]["operator_presence"]["Row"]["state"];

export interface OperatorPresenceDTO {
  workspace_id: string;
  operator_id: string;
  state: OperatorPresenceState;
  last_heartbeat_at: string;
  updated_at: string;
}

export async function listOperatorPresenceForWorkspace(
  requestedWorkspaceId?: string,
  options?: { operatorIds?: string[] },
): Promise<OperatorPresenceDTO[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  let query = supabase
    .from("operator_presence")
    .select("workspace_id, operator_id, state, last_heartbeat_at, updated_at")
    .eq("workspace_id", context.workspaceId);
  if (options?.operatorIds && options.operatorIds.length > 0) {
    query = query.in("operator_id", options.operatorIds);
  }
  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    throw new DataAccessError("DATABASE", "Operator presence could not be loaded");
  }

  return (data || []) as OperatorPresenceDTO[];
}
