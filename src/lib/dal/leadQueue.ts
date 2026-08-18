import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceContext, requireWorkspaceRole } from "./workspace";
import type { LeadDTO } from "./leads";

export type QueueState = Database["public"]["Tables"]["lead_queue_items"]["Row"]["state"];
export type OperatorPresenceState = Database["public"]["Tables"]["operator_presence"]["Row"]["state"];
export type QueueCallOutcome = "order_placed" | "followup_scheduled" | "no_answer" | "objection";

export interface LeadQueueSnapshot {
  queue_item_id: string;
  workspace_id: string;
  lead_id: string;
  assignment_state: Extract<QueueState, "assigned" | "in_progress">;
  assigned_operator_id: string;
  preferred_operator_id: string | null;
  available_at: string;
  scheduled_at: string | null;
  attempt_count: number;
  claimed_at: string | null;
  last_heartbeat_at: string | null;
  lease_expires_at: string | null;
  lead: LeadDTO;
}

export interface QueueCompletionDTO {
  call_id: string;
  order_id: string | null;
  lead_status: LeadDTO["status"];
  queue_state: QueueState;
  next_lead: LeadQueueSnapshot | null;
}

export interface QueueItemDTO {
  id: string;
  workspace_id: string;
  lead_id: string;
  assigned_operator_id: string | null;
  preferred_operator_id: string | null;
  state: QueueState;
  priority: number;
  available_at: string;
  scheduled_at: string | null;
  attempt_count: number;
  claimed_at: string | null;
  last_heartbeat_at: string | null;
  lease_expires_at: string | null;
  last_outcome: string | null;
  released_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lead: Pick<LeadDTO, "id" | "full_name" | "phone" | "email" | "status" | "ai_score">;
  assigned_operator: { id: string; full_name: string; email: string } | null;
  preferred_operator: { id: string; full_name: string; email: string } | null;
}

export interface CompleteLeadCallInput {
  queue_item_id: string;
  duration_seconds: number;
  outcome: QueueCallOutcome;
  transcript?: string | null;
  ai_sentiment?: string | null;
  order_product_id?: string | null;
  order_total_amount?: number | null;
  callback_scheduled_at?: string | null;
}

type QueueSnapshotRpc = LeadQueueSnapshot | null;

function getRpcErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function requireRpcData<T>(data: unknown, error: unknown, fallback: string): T {
  if (error) {
    throw new DataAccessError("DATABASE", getRpcErrorMessage(error, fallback));
  }
  return data as T;
}

function assertQueueInput(input: CompleteLeadCallInput): void {
  if (!input?.queue_item_id || typeof input.queue_item_id !== "string") {
    throw new DataAccessError("VALIDATION", "Call requires an active queue assignment");
  }

  if (!Number.isInteger(input.duration_seconds) || input.duration_seconds < 0) {
    throw new DataAccessError("VALIDATION", "Call duration must be a non-negative integer");
  }

  if (!input.outcome || !["order_placed", "followup_scheduled", "no_answer", "objection"].includes(input.outcome)) {
    throw new DataAccessError("VALIDATION", "Unsupported queue call outcome");
  }

  const hasProduct = Boolean(input.order_product_id);
  const hasAmount = input.order_total_amount !== null && input.order_total_amount !== undefined;
  if (hasProduct !== hasAmount) {
    throw new DataAccessError("VALIDATION", "Order product and amount must be provided together");
  }

  if (hasAmount && (!Number.isFinite(input.order_total_amount) || (input.order_total_amount as number) < 0)) {
    throw new DataAccessError("VALIDATION", "Order amount must be non-negative");
  }
}

export async function setOperatorPresenceForWorkspace(
  state: OperatorPresenceState,
  workspaceId?: string,
): Promise<{ workspace_id: string; operator_id: string; state: OperatorPresenceState; last_heartbeat_at: string }> {
  const context = await requireWorkspaceRole(["operator"], workspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("set_operator_presence", {
    target_workspace_id: context.workspaceId,
    target_state: state,
  });
  return requireRpcData(data, error, "Operator presence could not be updated");
}

export async function getCurrentLeadForWorkspace(workspaceId?: string): Promise<LeadQueueSnapshot | null> {
  const context = await requireWorkspaceRole(["operator"], workspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("get_current_lead", {
    target_workspace_id: context.workspaceId,
  });
  return requireRpcData<QueueSnapshotRpc>(data, error, "Current lead could not be loaded");
}

export async function claimNextLeadForWorkspace(workspaceId?: string): Promise<LeadQueueSnapshot | null> {
  const context = await requireWorkspaceRole(["operator"], workspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("claim_next_lead", {
    target_workspace_id: context.workspaceId,
  });
  return requireRpcData<QueueSnapshotRpc>(data, error, "Next lead could not be claimed");
}

export async function startLeadCallForWorkspace(queueItemId: string): Promise<LeadQueueSnapshot> {
  if (!queueItemId) {
    throw new DataAccessError("VALIDATION", "Call requires an active queue assignment");
  }

  await requireWorkspaceRole(["operator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("start_lead_call", {
    target_queue_item_id: queueItemId,
  });
  const snapshot = requireRpcData<LeadQueueSnapshot | null>(data, error, "Lead call could not be started");
  if (!snapshot) {
    throw new DataAccessError("NOT_FOUND", "Lead assignment is no longer available");
  }
  return snapshot;
}

export async function heartbeatLeadAssignmentForWorkspace(queueItemId: string): Promise<{ queue_item_id: string; lease_expires_at: string }> {
  if (!queueItemId) {
    throw new DataAccessError("VALIDATION", "Heartbeat requires an active queue assignment");
  }

  await requireWorkspaceRole(["operator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("heartbeat_lead_assignment", {
    target_queue_item_id: queueItemId,
  });
  return requireRpcData(data, error, "Lead assignment heartbeat failed");
}

export async function completeLeadCallForWorkspace(input: CompleteLeadCallInput): Promise<QueueCompletionDTO> {
  assertQueueInput(input);
  await requireWorkspaceRole(["operator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("complete_lead_call", {
    target_queue_item_id: input.queue_item_id,
    call_duration_seconds: input.duration_seconds,
    call_outcome: input.outcome,
    call_transcript: input.transcript || null,
    call_ai_sentiment: input.ai_sentiment || "Neutral",
    order_product_id: input.order_product_id || null,
    order_total_amount: input.order_total_amount ?? null,
    callback_scheduled_at: input.callback_scheduled_at || null,
  });
  return requireRpcData(data, error, "Call completion failed");
}

export async function listQueueItemsForWorkspace(workspaceId?: string): Promise<QueueItemDTO[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"], workspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("lead_queue_items")
    .select(`
      id, workspace_id, lead_id, assigned_operator_id, preferred_operator_id,
      state, priority, available_at, scheduled_at, attempt_count, claimed_at,
      last_heartbeat_at, lease_expires_at, last_outcome, released_at,
      completed_at, created_at, updated_at,
      lead:leads(id, full_name, phone, email, status, ai_score),
      assigned_operator:profiles!lead_queue_items_assigned_operator_id_fkey(id, full_name, email),
      preferred_operator:profiles!lead_queue_items_preferred_operator_id_fkey(id, full_name, email)
    `)
    .eq("workspace_id", context.workspaceId)
    .order("available_at", { ascending: true });

  if (error) {
    throw new DataAccessError("DATABASE", "Lead queue could not be loaded");
  }

  return (data || []) as unknown as QueueItemDTO[];
}

export async function releaseLeadAssignmentForWorkspace(
  queueItemId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("release_lead_assignment", {
    target_queue_item_id: queueItemId,
    release_reason: reason || null,
  });
  const snapshot = requireRpcData<LeadQueueSnapshot | null>(data, error, "Lead assignment could not be released");
  if (!snapshot) throw new DataAccessError("NOT_FOUND", "Queue item was not found");
  return snapshot;
}

export async function reassignLeadAssignmentForWorkspace(
  queueItemId: string,
  operatorId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("reassign_lead_assignment", {
    target_queue_item_id: queueItemId,
    target_operator_id: operatorId,
    reassignment_reason: reason || null,
  });
  const snapshot = requireRpcData<LeadQueueSnapshot | null>(data, error, "Lead assignment could not be reassigned");
  if (!snapshot) throw new DataAccessError("NOT_FOUND", "Queue item was not found");
  return snapshot;
}

export async function reopenLeadAssignmentForWorkspace(
  queueItemId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("reopen_lead_assignment", {
    target_queue_item_id: queueItemId,
    reopen_reason: reason || null,
  });
  const snapshot = requireRpcData<LeadQueueSnapshot | null>(data, error, "Lead could not be reopened");
  if (!snapshot) throw new DataAccessError("NOT_FOUND", "Queue item was not found");
  return snapshot;
}

export async function getScopedLeadForWorkspace(leadId: string, workspaceId?: string): Promise<LeadDTO> {
  const context = await requireWorkspaceContext(workspaceId);

  if (context.role === "operator") {
    const current = await getCurrentLeadForWorkspace(context.workspaceId);
    if (!current || current.lead_id !== leadId) {
      throw new DataAccessError("NOT_FOUND", "Contact unavailable");
    }
    return current.lead;
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, workspace_id, full_name, phone, email, city, company, country, status, ai_score, notes, created_at, updated_at")
    .eq("workspace_id", context.workspaceId)
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw new DataAccessError("DATABASE", "Lead lookup failed");
  if (!data) throw new DataAccessError("NOT_FOUND", "Lead not found in workspace");
  return data as LeadDTO;
}
