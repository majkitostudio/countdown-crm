import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { createDataClient } from "./db";

type CallOutcome = Database["public"]["Tables"]["calls"]["Row"]["outcome"];

export type CompletionOutcome = "order_placed" | "followup_scheduled" | "no_answer" | "objection_handled";

export interface CompleteCallInput {
  lead_id: string;
  duration_seconds: number;
  outcome: CompletionOutcome;
  transcript?: string | null;
  ai_sentiment?: string | null;
  order_product_id?: string | null;
  order_total_amount?: number | null;
}

export interface CompleteCallDTO {
  call_id: string;
  order_id: string | null;
  lead_status: Database["public"]["Tables"]["leads"]["Row"]["status"];
  operator_name: string;
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

  const hasProduct = Boolean(input.order_product_id);
  const hasAmount = input.order_total_amount !== null && input.order_total_amount !== undefined;
  if (hasProduct !== hasAmount) {
    throw new DataAccessError("VALIDATION", "Order product and amount must be provided together");
  }

  if (hasAmount && (!Number.isFinite(input.order_total_amount) || (input.order_total_amount as number) < 0)) {
    throw new DataAccessError("VALIDATION", "Order amount must be a non-negative number");
  }

  const context = await requireWorkspaceContext(workspaceId);
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
  const { data, error } = await supabase.rpc("complete_call_with_order", {
    p_lead_id: input.lead_id,
    p_duration_seconds: input.duration_seconds,
    p_outcome: outcomeMap[input.outcome],
    p_transcript: input.transcript || null,
    p_ai_sentiment: input.ai_sentiment || "Neutral",
    p_order_product_id: input.order_product_id || null,
    p_order_total_amount: input.order_total_amount ?? null,
  });

  if (error || !data || !Array.isArray(data) || data.length !== 1) {
    throw new DataAccessError("DATABASE", "Call completion failed");
  }

  const row = data[0] as CompleteCallDTO;
  if (!row.call_id || row.lead_status === undefined) {
    throw new DataAccessError("DATABASE", "Call completion returned an invalid result");
  }

  return { ...row, operator_name: operatorName };
}
