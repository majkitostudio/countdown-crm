import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceContext, requireWorkspaceRole } from "./workspace";
import type { LeadDTO } from "./leads";
import { dispatchWorkflowEventForWorkspace } from "@/lib/workflows/dispatcher";
import type { WorkflowDispatchResult } from "@/lib/workflows/types";
import { totalCallOrderItems, type CallOrderItemInput } from "@/lib/callOrder";
import { isFailReason, validateFailDetails, type FailReason } from "@/lib/postCall";

export type QueueState = Database["public"]["Tables"]["lead_queue_items"]["Row"]["state"];
export type OperatorPresenceState = Database["public"]["Tables"]["operator_presence"]["Row"]["state"];
export type QueueCallOutcome = "order_placed" | "followup_scheduled" | "no_answer" | "objection";

export interface LeadQueueSnapshot {
  queue_item_id: string;
  workspace_id: string;
  lead_id: string;
  assignment_state: Extract<QueueState, "assigned" | "in_progress" | "awaiting_outcome">;
  assigned_operator_id: string;
  preferred_operator_id: string | null;
  available_at: string;
  scheduled_at: string | null;
  attempt_count: number;
  claimed_at: string | null;
  last_heartbeat_at: string | null;
  lease_expires_at: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  recovery_required: boolean;
  lead: LeadDTO;
}

export interface QueueCompletionDTO {
  call_id: string;
  order_id: string | null;
  lead_status: LeadDTO["status"];
  queue_state: QueueState;
  duration_seconds: number;
  next_lead: LeadQueueSnapshot | null;
  workflowDispatches: WorkflowDispatchResult[];
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
  call_started_at: string | null;
  call_ended_at: string | null;
  recovery_required: boolean;
  created_at: string;
  updated_at: string;
  lead: Pick<LeadDTO, "id" | "full_name" | "phone" | "email" | "status" | "ai_score">;
  assigned_operator: { id: string; full_name: string; email: string } | null;
  preferred_operator: { id: string; full_name: string; email: string } | null;
}

export interface ScheduledCallbackDTO {
  id: string;
  workspace_id: string;
  lead_id: string;
  scheduled_at: string;
  preferred_operator_id: string | null;
  lead: { id: string; full_name: string; phone: string; email: string | null };
  preferred_operator: { id: string; full_name: string; email: string } | null;
}

export interface CompleteLeadCallInput {
  queue_item_id: string;
  duration_seconds: number;
  outcome: QueueCallOutcome;
  transcript?: string | null;
  ai_sentiment?: string | null;
  order_items?: CallOrderItemInput[] | null;
  order_product_id?: string | null;
  order_total_amount?: number | null;
  callback_scheduled_at?: string | null;
  operator_note?: string | null;
  fail_reason?: FailReason | null;
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

  const operatorNote = input.operator_note || "";
  if (operatorNote.trim().length > 2_000) {
    throw new DataAccessError("VALIDATION", "Call note must contain at most 2,000 characters");
  }
  if (input.outcome === "objection") {
    const failError = validateFailDetails({ failReason: input.fail_reason, note: operatorNote });
    if (failError) throw new DataAccessError("VALIDATION", failError);
  } else if (input.fail_reason !== null && input.fail_reason !== undefined) {
    throw new DataAccessError("VALIDATION", "Fail reason is only valid for a fail outcome");
  }

  const hasLegacyProduct = Boolean(input.order_product_id);
  const hasLegacyAmount = input.order_total_amount !== null && input.order_total_amount !== undefined;
  if (input.order_items == null && hasLegacyProduct !== hasLegacyAmount) {
    throw new DataAccessError("VALIDATION", "Order product and amount must be provided together");
  }
  if (input.order_items == null && hasLegacyAmount && (!Number.isFinite(input.order_total_amount) || (input.order_total_amount as number) < 0)) {
    throw new DataAccessError("VALIDATION", "Order amount must be non-negative");
  }

  const orderItems = input.order_items ?? (
    input.order_product_id
      ? [{
          product_id: input.order_product_id,
          quantity: 1,
          unit_price: input.order_total_amount ?? 0,
        }]
      : []
  );
  const hasOrder = orderItems.length > 0;
  if (input.outcome === "order_placed" && !hasOrder) {
    throw new DataAccessError("VALIDATION", "An order call requires at least one order item");
  }
  if (input.outcome !== "order_placed" && hasOrder) {
    throw new DataAccessError("VALIDATION", "Order items require an order call outcome");
  }
  if (orderItems.length > 50) {
    throw new DataAccessError("VALIDATION", "An order may contain at most 50 items");
  }
  if (new Set(orderItems.map((item) => item.product_id)).size !== orderItems.length) {
    throw new DataAccessError("VALIDATION", "Each product may appear only once in an order");
  }
  for (const item of orderItems) {
    if (!item.product_id.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
      throw new DataAccessError("VALIDATION", "Order item quantity must be between 1 and 1000");
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price > 1_000_000_000) {
      throw new DataAccessError("VALIDATION", "Order item unit price must be between 0 and 1000000000");
    }
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

export async function heartbeatLeadAssignmentForWorkspace(queueItemId: string): Promise<{ queue_item_id: string; lease_expires_at: string | null }> {
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

export async function endLeadCallForWorkspace(queueItemId: string): Promise<LeadQueueSnapshot> {
  if (!queueItemId) {
    throw new DataAccessError("VALIDATION", "Ending a call requires an active queue assignment");
  }

  await requireWorkspaceRole(["operator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("end_lead_call", {
    target_queue_item_id: queueItemId,
  });
  const snapshot = requireRpcData<LeadQueueSnapshot | null>(data, error, "Call could not be ended safely");
  if (!snapshot) throw new DataAccessError("NOT_FOUND", "Lead assignment is no longer available");
  return snapshot;
}

export async function abortLeadCallStartForWorkspace(
  queueItemId: string,
  reason?: string | null,
): Promise<LeadQueueSnapshot> {
  if (!queueItemId) {
    throw new DataAccessError("VALIDATION", "Call start recovery requires an active queue assignment");
  }

  await requireWorkspaceRole(["operator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("abort_lead_call_start", {
    target_queue_item_id: queueItemId,
    abort_reason: reason || null,
  });
  const snapshot = requireRpcData<LeadQueueSnapshot | null>(data, error, "Call start recovery failed");
  if (!snapshot) throw new DataAccessError("NOT_FOUND", "Lead assignment is no longer available");
  return snapshot;
}

export async function completeLeadCallForWorkspace(input: CompleteLeadCallInput): Promise<QueueCompletionDTO> {
  assertQueueInput(input);
  const operatorNote = input.operator_note || "";
  const orderItems = input.order_items ?? (
    input.order_product_id
      ? [{
          product_id: input.order_product_id,
          quantity: 1,
          unit_price: input.order_total_amount ?? 0,
        }]
      : []
  );
  const hasOrder = orderItems.length > 0;
  const context = await requireWorkspaceRole(["operator"]);
  const currentLead = await getCurrentLeadForWorkspace(context.workspaceId);
  if (!currentLead || currentLead.queue_item_id !== input.queue_item_id) {
    throw new DataAccessError("NOT_FOUND", "Lead assignment is no longer available");
  }
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("complete_lead_call_with_order_items", {
    target_queue_item_id: input.queue_item_id,
    call_duration_seconds: input.duration_seconds,
    call_outcome: input.outcome,
    call_transcript: input.transcript || null,
    call_ai_sentiment: input.ai_sentiment || "Neutral",
    order_items: hasOrder ? orderItems : null,
    callback_scheduled_at: input.callback_scheduled_at || null,
    call_note: operatorNote.trim() || null,
    call_fail_reason: input.fail_reason && isFailReason(input.fail_reason) ? input.fail_reason : null,
  });
  const completion = requireRpcData<QueueCompletionDTO>(data, error, "Call completion failed");
  const workflowDispatch = await dispatchWorkflowEventForWorkspace({
    trigger: "on_call_ended",
    eventId: completion.call_id,
    payload: {
      callId: completion.call_id,
      leadId: currentLead.lead_id,
      leadName: currentLead.lead.full_name,
      agentName: "Authenticated operator",
      outcome: input.outcome,
      sentiment: input.ai_sentiment || "Neutral",
      orderValue: hasOrder ? totalCallOrderItems(orderItems) : 0,
      transcript: input.transcript || "",
      failReason: input.fail_reason || null,
      operatorNote: operatorNote.trim(),
    },
  });

  return { ...completion, workflowDispatches: [workflowDispatch] };
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
      call_started_at, call_ended_at, recovery_required,
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

export async function listScheduledCallbacksForWorkspace(
  from: string,
  to: string,
  workspaceId?: string,
): Promise<ScheduledCallbackDTO[]> {
  const context = await requireWorkspaceContext(workspaceId);
  const supabase = await createDataClient();
  let query = supabase
    .from("lead_queue_items")
    .select(`
      id, workspace_id, lead_id, scheduled_at, preferred_operator_id,
      lead:leads(id, full_name, phone, email),
      preferred_operator:profiles!lead_queue_items_preferred_operator_id_fkey(id, full_name, email)
    `)
    .eq("workspace_id", context.workspaceId)
    .eq("state", "waiting_callback")
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", from)
    .lte("scheduled_at", to)
    .order("scheduled_at", { ascending: true });

  if (context.role === "operator") {
    query = query.eq("preferred_operator_id", context.userId);
  }

  const { data, error } = await query;
  if (error) throw new DataAccessError("DATABASE", "Scheduled callbacks could not be loaded.");
  return (data || []) as unknown as ScheduledCallbackDTO[];
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
