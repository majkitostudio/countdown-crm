import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { createDataClient } from "./db";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];
type CallOutcome = CallRow["outcome"];

export type CallDTO = Pick<
  CallRow,
  | "id"
  | "workspace_id"
  | "lead_id"
  | "agent_id"
  | "duration_seconds"
  | "outcome"
  | "transcript"
  | "ai_sentiment"
  | "created_at"
>;

export interface CreateCallInput {
  lead_id?: string | null;
  agent_id?: string | null;
  duration_seconds?: number;
  outcome?: CallOutcome;
  transcript?: string | null;
  ai_sentiment?: string | null;
}

export async function createCallForWorkspace(
  input: CreateCallInput,
  workspaceId?: string
): Promise<CallDTO> {
  if (
    input.duration_seconds !== undefined &&
    (!Number.isInteger(input.duration_seconds) || input.duration_seconds < 0)
  ) {
    throw new DataAccessError("VALIDATION", "Call duration must be a non-negative integer");
  }

  if (input.transcript && input.transcript.length > 100_000) {
    throw new DataAccessError("VALIDATION", "Call transcript is too long");
  }

  const context = await requireWorkspaceContext(workspaceId);
  const supabase = await createDataClient();

  if (input.lead_id) {
    const { data, error } = await supabase
      .from("leads")
      .select("id")
      .eq("id", input.lead_id)
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();

    if (error) {
      throw new DataAccessError("DATABASE", "Call lead lookup failed");
    }
    if (!data) {
      throw new DataAccessError("VALIDATION", "Call lead does not belong to workspace");
    }
  }

  const { data, error } = await supabase
    .from("calls")
    .insert({
      workspace_id: context.workspaceId,
      lead_id: input.lead_id || null,
      agent_id: input.agent_id || context.userId,
      duration_seconds: input.duration_seconds ?? 0,
      outcome: input.outcome || "completed",
      transcript: input.transcript || null,
      ai_sentiment: input.ai_sentiment || "Neutral",
    })
    .select("id, workspace_id, lead_id, agent_id, duration_seconds, outcome, transcript, ai_sentiment, created_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Call creation failed");
  }

  return data as CallDTO;
}
