import { getCallAction, listCallsAction, listTrainingCallLogRecordsAction } from "@/app/actions/crm";
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
  record_kind?: "production" | "training";
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
  const [calls, trainingCalls] = await Promise.all([listCallsAction(), listTrainingCallLogRecordsAction()]);

  const production = calls.map((call) => ({
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
    record_kind: "production" as const,
  }));
  const training = trainingCalls.map((call) => ({
    id: call.id,
    lead_id: "",
    lead_name: call.customerName,
    agent_name: call.operatorName,
    duration_seconds: call.durationSeconds,
    outcome: "completed" as PersistedCallOutcome,
    fail_reason: null,
    operator_note: "Tréninkový hovor – nevznikla objednávka ani callback.",
    sentiment: "Neutral" as const,
    order_value: 0,
    transcript: parseCallTranscript(call.transcript),
    created_at: call.createdAt,
    review_href: call.reviewHref,
    review_status: call.reviewHref ? "not_reviewed" as CallReviewStatus : null,
    record_kind: "training" as const,
  }));
  return [...production, ...training].sort((left, right) => right.created_at.localeCompare(left.created_at));
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
    record_kind: "production",
  };
}
