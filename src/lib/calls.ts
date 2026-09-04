import { getCallAction, listCallsAction } from "@/app/actions/crm";
import type { Database } from "./supabase/types";

export type PersistedCallOutcome = Database["public"]["Tables"]["calls"]["Row"]["outcome"];

export interface TranscriptEntry {
  speaker: "operator" | "customer";
  text: string;
  timestamp: string;
}

export interface CallRecord {
  id: string;
  lead_id: string;
  lead_name: string;
  agent_name: string;
  duration_seconds: number;
  outcome: PersistedCallOutcome;
  sentiment: "Positive" | "Price Objection" | "Product Objection" | "Neutral";
  order_value: number;
  transcript: TranscriptEntry[];
  created_at: string;
}

function parseTranscript(value: string | null): TranscriptEntry[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as TranscriptEntry[]) : [];
  } catch {
    return [];
  }
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
    sentiment: (call.sentiment as CallRecord["sentiment"]) || "Neutral",
    order_value: call.order_value,
    transcript: parseTranscript(call.transcript),
    created_at: call.created_at,
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
    sentiment: (call.sentiment as CallRecord["sentiment"]) || "Neutral",
    order_value: call.order_value,
    transcript: parseTranscript(call.transcript),
    created_at: call.created_at,
  };
}
