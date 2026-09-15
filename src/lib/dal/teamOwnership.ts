import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "./db";
import { DataAccessError } from "./errors";
import { requireWorkspaceRole } from "./workspace";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type QueueItemRow = Database["public"]["Tables"]["lead_queue_items"]["Row"];

export type TeamOwnershipResourceType = "lead" | "queue_item";

export interface TeamOwnershipLeadDTO {
  id: string;
  workspace_id: string;
  team_id: string | null;
  full_name: string;
  phone: string;
  status: LeadRow["status"];
}

export interface TeamOwnershipQueueItemDTO {
  id: string;
  workspace_id: string;
  lead_id: string;
  team_id: string | null;
  state: QueueItemRow["state"];
  assigned_operator_id: string | null;
  created_at: string;
  lead: { id: string; full_name: string } | null;
  assigned_operator: { id: string; full_name: string; email: string } | null;
}

export interface TeamOwnershipData {
  leads: TeamOwnershipLeadDTO[];
  queueItems: TeamOwnershipQueueItemDTO[];
}

export interface TeamOwnershipAssignmentResult {
  resource_type: TeamOwnershipResourceType;
  resource_id: string;
  workspace_id: string;
  team_id: string | null;
  changed: boolean;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function listTeamOwnershipRecords(): Promise<TeamOwnershipData> {
  const context = await requireWorkspaceRole(["administrator"]);
  const supabase = await createDataClient();

  const [{ data: leads, error: leadsError }, { data: queueItems, error: queueError }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, workspace_id, team_id, full_name, phone, status")
      .eq("workspace_id", context.workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_queue_items")
      .select(`
        id, workspace_id, lead_id, team_id, state, assigned_operator_id, created_at,
        lead:leads(id, full_name),
        assigned_operator:profiles!lead_queue_items_assigned_operator_id_fkey(id, full_name, email)
      `)
      .eq("workspace_id", context.workspaceId)
      .order("created_at", { ascending: false }),
  ]);

  if (leadsError || queueError) {
    throw new DataAccessError("DATABASE", "Team ownership records could not be loaded");
  }

  return {
    leads: (leads || []) as TeamOwnershipLeadDTO[],
    queueItems: (queueItems || []) as unknown as TeamOwnershipQueueItemDTO[],
  };
}

export async function assignTeamOwnership(input: {
  resourceType: TeamOwnershipResourceType;
  resourceId: string;
  teamId: string | null;
}): Promise<TeamOwnershipAssignmentResult> {
  await requireWorkspaceRole(["administrator"]);

  if (!input || !["lead", "queue_item"].includes(input.resourceType)) {
    throw new DataAccessError("VALIDATION", "Ownership record type is invalid");
  }
  if (!isUuid(input.resourceId)) {
    throw new DataAccessError("VALIDATION", "Ownership record is invalid");
  }
  if (input.teamId !== null && !isUuid(input.teamId)) {
    throw new DataAccessError("VALIDATION", "Team is invalid");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("assign_team_ownership", {
    target_resource_type: input.resourceType,
    target_resource_id: input.resourceId,
    target_team_id: input.teamId,
  });

  if (error || !data) {
    throw new DataAccessError("DATABASE", error?.message || "Team ownership could not be updated");
  }

  return data as unknown as TeamOwnershipAssignmentResult;
}
