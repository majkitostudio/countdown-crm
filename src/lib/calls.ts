import { getCallAction, listCallsAction } from "@/app/actions/crm";
import { parseCallTranscript, type CallTranscript } from "./callTranscript";
import type { WorkspaceCallDTO } from "./dal/activity";
import type { CallReviewStatus } from "./dal/callReviews";
import type { Database } from "./supabase/types";

export type PersistedCallOutcome = Database["public"]["Tables"]["calls"]["Row"]["outcome"];

export interface CallRecord {
  id: string;
  lead_id: string;
  lead_name: string;
  agent_name: string;
  duration_seconds: number;
  outcome: PersistedCallOutcome;
  fail_reason: WorkspaceCallDTO["fail_reason"];
  operator_note: WorkspaceCallDTO["operator_note"];
  sentiment: "Positive" | "Price Objection" | "Product Objection" | "Neutral";
  order_value: number;
  transcript: CallTranscript;
  created_at: string;
  review_href: string | null;
  review_status: CallReviewStatus | null;
}

export function formatCallOutcome(outcome: CallRecord["outcome"]): string {
  switch (outcome) {
    case "order_placed":
      return "Order placed";
    case "followup_scheduled":
      return "Follow-up scheduled";
    case "objection":
      return "Fail";
    case "no_answer":
      return "No answer";
    case "completed":
      return "Completed";
    default:
      return "Unknown outcome";
  }
}

export async function getCalls(): Promise<CallRecord[]> {
  const calls = await listCallsAction();

  return calls.map((call) => ({
    id: call.id,
    lead_id: call.lead_id || "",
    lead_name: call.lead_name,
    agent_name: call.agent_name,
    duration_seconds: call.duration_seconds || 0,
    outcome: call.outcome,
    fail_reason: call.fail_reason,
    operator_note: call.operator_note,
    sentiment: (call.sentiment as CallRecord["sentiment"]) || "Neutral",
    order_value: call.order_value,
    transcript: parseCallTranscript(call.transcript),
    created_at: call.created_at,
    review_href: call.review_href,
    review_status: call.review_status,
  }));
}

export async function getCallById(id: string): Promise<CallRecord | null> {
  const call = await getCallAction(id);
  if (!call) return null;

  return {
    id: call.id,
    lead_id: call.lead_id || "",
    lead_name: call.lead_name,
    agent_name: call.agent_name,
    duration_seconds: call.duration_seconds || 0,
    outcome: call.outcome,
    fail_reason: call.fail_reason,
    operator_note: call.operator_note,
    sentiment: (call.sentiment as CallRecord["sentiment"]) || "Neutral",
    order_value: call.order_value,
    transcript: parseCallTranscript(call.transcript),
    created_at: call.created_at,
    review_href: null,
    review_status: null,
  };
}
