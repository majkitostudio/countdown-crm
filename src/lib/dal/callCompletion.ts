import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { createDataClient } from "./db";
import { getScopedLeadForWorkspace } from "./leadQueue";
import { dispatchWorkflowEventForWorkspace } from "@/lib/workflows/dispatcher";
import type { WorkflowDispatchResult } from "@/lib/workflows/types";
import { totalCallOrderItems, type CallOrderItemInput } from "@/lib/callOrder";
import { validateCallFailFields, type FailReason } from "@/lib/postCall";

type CallOutcome = Database["public"]["Tables"]["calls"]["Row"]["outcome"];

export type CompletionOutcome = "order_placed" | "followup_scheduled" | "no_answer" | "objection_handled";

export interface CompleteCallInput {
  lead_id: string;
  /** Stable identity for a retry of the same post-call submission. */
  call_session_id: string;
  duration_seconds: number;
  outcome: CompletionOutcome;
  transcript?: string | null;
  ai_sentiment?: string | null;
  order_items?: CallOrderItemInput[] | null;
  order_product_id?: string | null;
  order_total_amount?: number | null;
  callback_scheduled_at?: string | null;
  operator_note?: string | null;
  fail_reason?: FailReason | null;
}

export interface CompleteCallDTO {
  call_id: string;
  order_id: string | null;
  lead_status: Database["public"]["Tables"]["leads"]["Row"]["status"];
  operator_name: string;
  workflowDispatches: WorkflowDispatchResult[];
}

const outcomeMap: Record<CompletionOutcome, CallOutcome> = {
  order_placed: "order_placed",
  followup_scheduled: "followup_scheduled",
  no_answer: "no_answer",
  objection_handled: "objection",
};

function normalizeOptionalText(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function completeCallForWorkspace(
  input: CompleteCallInput,
  workspaceId?: string
): Promise<CompleteCallDTO> {
  if (!input || typeof input !== "object" || typeof input.lead_id !== "string" || !input.lead_id.trim()) {
    throw new DataAccessError("VALIDATION", "Call requires a lead");
  }

  if (!Number.isInteger(input.duration_seconds) || input.duration_seconds < 0) {
    throw new DataAccessError("VALIDATION", "Call duration must be a non-negative integer");
  }
  if (!isUuid(input.call_session_id)) {
    throw new DataAccessError("VALIDATION", "Call completion requires a server-authorized call session");
  }
  if (!Object.prototype.hasOwnProperty.call(outcomeMap, input.outcome)) {
    throw new DataAccessError("VALIDATION", "Unsupported call outcome");
  }

  const operatorNote = normalizeOptionalText(input.operator_note);
  const failError = validateCallFailFields({
    outcome: outcomeMap[input.outcome],
    failReason: input.fail_reason,
    note: operatorNote || "",
  });
  if (failError) throw new DataAccessError("VALIDATION", failError);
  if (input.outcome === "followup_scheduled" && (!isString(input.callback_scheduled_at) || !input.callback_scheduled_at.trim())) {
    throw new DataAccessError("VALIDATION", "Callback date and time are required");
  }
  if (input.outcome !== "followup_scheduled" && input.callback_scheduled_at) {
    throw new DataAccessError("VALIDATION", "Callback time is only valid for Schedule Callback");
  }

  const context = await requireWorkspaceContext(workspaceId);
  return completeCallForAuthorizedWorkspace(input, context, operatorNote);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

async function completeCallForAuthorizedWorkspace(
  input: CompleteCallInput,
  context: Awaited<ReturnType<typeof requireWorkspaceContext>>,
  operatorNote: string | null,
): Promise<CompleteCallDTO> {

  const hasLegacyProduct = Boolean(input.order_product_id);
  if (input.order_items != null && !Array.isArray(input.order_items)) {
    throw new DataAccessError("VALIDATION", "Order items must be an array");
  }
  if (input.order_product_id != null && typeof input.order_product_id !== "string") {
    throw new DataAccessError("VALIDATION", "Order product is invalid");
  }
  const hasLegacyAmount = input.order_total_amount !== null && input.order_total_amount !== undefined;
  if (input.order_items == null && hasLegacyProduct !== hasLegacyAmount) {
    throw new DataAccessError("VALIDATION", "Order product and amount must be provided together");
  }
  if (input.order_items == null && hasLegacyAmount && (!Number.isFinite(input.order_total_amount) || (input.order_total_amount as number) < 0)) {
    throw new DataAccessError("VALIDATION", "Order amount must be a non-negative number");
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
    if (!item || typeof item !== "object" || typeof item.product_id !== "string" || !item.product_id.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
      throw new DataAccessError("VALIDATION", "Order item quantity must be between 1 and 1000");
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price > 1_000_000_000) {
      throw new DataAccessError("VALIDATION", "Order item unit price must be between 0 and 1000000000");
    }
  }

  const lead = await getScopedLeadForWorkspace(input.lead_id, context.workspaceId);
  const supabase = await createDataClient();
  const { data: operatorProfile, error: operatorProfileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", context.userId)
    .maybeSingle();

  if (operatorProfileError) {
    throw new DataAccessError("DATABASE", "Operator profile lookup failed");
  }

  const operatorName = operatorProfile?.full_name?.trim() || "Unknown operator";
  const { data, error } = await supabase.rpc("complete_call_with_order_items_idempotent", {
    completion_key: input.call_session_id,
    call_session_id: input.call_session_id,
    lead_id: input.lead_id,
    duration_seconds: input.duration_seconds,
    outcome: outcomeMap[input.outcome],
    transcript: normalizeOptionalText(input.transcript),
    ai_sentiment: normalizeOptionalText(input.ai_sentiment) || "Neutral",
    order_items: hasOrder ? orderItems : null,
    callback_scheduled_at: input.callback_scheduled_at || null,
    call_note: operatorNote,
    call_fail_reason: input.fail_reason || null,
  });

  if (error || !data || !Array.isArray(data) || data.length !== 1) {
    throw new DataAccessError("DATABASE", "Call completion failed");
  }

  const row = data[0] as CompleteCallDTO;
  if (!row.call_id || row.lead_status === undefined) {
    throw new DataAccessError("DATABASE", "Call completion returned an invalid result");
  }

  const workflowDispatch = await dispatchWorkflowEventForWorkspace({
    trigger: "on_call_ended",
    eventId: row.call_id,
    payload: {
      callId: row.call_id,
      leadId: lead.id,
      leadName: lead.full_name,
      agentName: operatorName,
      outcome: input.outcome,
      sentiment: normalizeOptionalText(input.ai_sentiment) || "Neutral",
      orderValue: hasOrder ? totalCallOrderItems(orderItems) : 0,
      transcript: normalizeOptionalText(input.transcript) || "",
      callbackScheduledAt: input.callback_scheduled_at || null,
      failReason: input.fail_reason || null,
      operatorNote: operatorNote || "",
    },
  });

  return { ...row, operator_name: operatorName, workflowDispatches: [workflowDispatch] };
}
