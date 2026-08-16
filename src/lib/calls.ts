import { listCallsAction } from "@/app/actions/crm";

export interface TranscriptEntry {
  speaker: "agent" | "customer";
  text: string;
  timestamp: string;
}

export interface CallRecord {
  id: string;
  lead_id: string;
  lead_name: string;
  agent_name: string;
  duration_seconds: number;
  outcome: "order_placed" | "followup_scheduled" | "no_answer" | "objection_handled";
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

function mapCallOutcome(outcome: string): CallRecord["outcome"] {
  if (outcome === "objection") return "objection_handled";
  if (outcome === "completed") return "followup_scheduled";
  return outcome as CallRecord["outcome"];
}

export async function getCalls(): Promise<CallRecord[]> {
  const calls = await listCallsAction();

  return calls.map((call) => ({
    id: call.id,
    lead_id: call.lead_id || "",
    lead_name: call.lead_name,
    agent_name: call.agent_name,
    duration_seconds: call.duration_seconds || 0,
    outcome: mapCallOutcome(call.outcome),
    sentiment: (call.sentiment as CallRecord["sentiment"]) || "Neutral",
    order_value: call.order_value,
    transcript: parseTranscript(call.transcript),
    created_at: call.created_at,
  }));
}

export async function getCallById(id: string): Promise<CallRecord | null> {
  const calls = await getCalls();
  return calls.find((call) => call.id === id) || null;
}
