import { createClient } from "./supabase/client";
import { Database } from "./supabase/types";
import { getCurrentWorkspaceId } from "./supabase/workspace";

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

type CallRow = Database["public"]["Tables"]["calls"]["Row"];

function parseTranscript(value: string | null): TranscriptEntry[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as TranscriptEntry[]) : [];
  } catch {
    return [];
  }
}

export async function getCalls(): Promise<CallRecord[]> {
  const supabase = createClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Call query failed");

  return ((data || []) as CallRow[]).map((call) => ({
    id: call.id,
    lead_id: call.lead_id || "",
    lead_name: "Customer",
    agent_name: "Operator",
    duration_seconds: call.duration_seconds || 0,
    outcome: (call.outcome as CallRecord["outcome"]) || "followup_scheduled",
    sentiment: (call.ai_sentiment as CallRecord["sentiment"]) || "Neutral",
    order_value: 0,
    transcript: parseTranscript(call.transcript),
    created_at: call.created_at,
  }));
}

export async function getCallById(id: string): Promise<CallRecord | null> {
  const calls = await getCalls();
  return calls.find((call) => call.id === id) || null;
}

export async function addCallRecord(newCallPayload: Partial<CallRecord>): Promise<CallRecord> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new Error("No active workspace");
  if (!newCallPayload.lead_id) throw new Error("Call requires a lead");

  const transcript = newCallPayload.transcript || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data, error } = await supabase.from("calls").insert({
    workspace_id: workspaceId,
    lead_id: newCallPayload.lead_id,
    duration_seconds: newCallPayload.duration_seconds || 0,
    outcome: newCallPayload.outcome === "objection_handled" ? "completed" : newCallPayload.outcome || "completed",
    transcript: JSON.stringify(transcript),
    ai_sentiment: newCallPayload.sentiment || "Neutral",
  }).select("*").single();

  if (error || !data) throw new Error("Call could not be saved");

  const saved = data as CallRow;
  return {
    id: saved.id,
    lead_id: saved.lead_id || newCallPayload.lead_id,
    lead_name: newCallPayload.lead_name || "Customer",
    agent_name: newCallPayload.agent_name || "Operator",
    duration_seconds: saved.duration_seconds,
    outcome: saved.outcome as CallRecord["outcome"],
    sentiment: (saved.ai_sentiment as CallRecord["sentiment"]) || "Neutral",
    order_value: newCallPayload.order_value || 0,
    transcript,
    created_at: saved.created_at,
  };
}
