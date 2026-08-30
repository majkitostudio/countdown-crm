import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { createDataClient } from "./db";
import { getScopedLeadForWorkspace } from "./leadQueue";
import { dispatchWorkflowEventForWorkspace } from "@/lib/workflows/dispatcher";
import type { WorkflowDispatchResult } from "@/lib/workflows/types";
import type { CallOrderItemInput } from "@/lib/callOrder";

type CallOutcome = Database["public"]["Tables"]["calls"]["Row"]["outcome"];

export type CompletionOutcome = "order_placed" | "followup_scheduled" | "no_answer" | "objection_handled";

export interface CompleteCallInput {
  lead_id: string;
  duration_seconds: number;
  outcome: CompletionOutcome;
  transcript?: string | null;
  ai_sentiment?: string | null;
  order_items?: CallOrderItemInput[] | null;
  order_product_id?: string | null;
  order_total_amount?: number | null;
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

export async function completeCallForWorkspace(
  input: CompleteCallInput,
  workspaceId?: string
): Promise<CompleteCallDTO> {
  if (!input.lead_id) {
    throw new DataAccessError("VALIDATION", "Call requires a lead");
  }

  if (!Number.isInteger(input.duration_seconds) || input.duration_seconds < 0) {
    throw new DataAccessError("VALIDATION", "Call duration must be a non-negative integer");
  }

  const hasLegacyProduct = Boolean(input.order_product_id);
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
  for (const item of orderItems) {
    if (!item.product_id.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
      throw new DataAccessError("VALIDATION", "Order item quantity must be between 1 and 1000");
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price > 1_000_000_000) {
      throw new DataAccessError("VALIDATION", "Order item unit price must be between 0 and 1000000000");
    }
  }

  const context = await requireWorkspaceContext(workspaceId);
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
  const { data, error } = await supabase.rpc("complete_call_with_order_items", {
    p_lead_id: input.lead_id,
    p_duration_seconds: input.duration_seconds,
    p_outcome: outcomeMap[input.outcome],
    p_transcript: input.transcript || null,
    p_ai_sentiment: input.ai_sentiment || "Neutral",
    p_order_items: hasOrder ? orderItems : null,
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
      sentiment: input.ai_sentiment || "Neutral",
      orderValue: input.order_total_amount ?? 0,
      transcript: input.transcript || "",
    },
  });

  return { ...row, operator_name: operatorName, workflowDispatches: [workflowDispatch] };
}
