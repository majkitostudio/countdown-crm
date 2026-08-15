"use server";

import { isDemoAuthEnabled } from "@/lib/auth/config";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { createDataClient } from "@/lib/dal/db";
import type { TrainingMessage, TrainingScenario, TrainingScorecard } from "@/lib/training";

export type TrainingSessionSaveResult =
  | { ok: true; sessionId: string }
  | { ok: false; code: "UNAVAILABLE" | "DATABASE" | "VALIDATION"; message: string };

type SaveTrainingSessionInput = {
  scenario: TrainingScenario;
  messages: TrainingMessage[];
  scorecard: TrainingScorecard;
  durationSeconds: number;
  aiSource: "gemini-flash" | "openai-responses" | "rule-engine" | null;
  startedAt: string;
};

const validSources = new Set(["typed", "browser_speech", "ai_customer", "scenario"]);

function isValidMessage(message: TrainingMessage): boolean {
  return Boolean(
    message &&
      typeof message.text === "string" &&
      message.text.trim().length > 0 &&
      message.text.length <= 4_000 &&
      (message.sender === "user" || message.sender === "ai_customer") &&
      (!message.source || validSources.has(message.source))
  );
}

export async function saveTrainingSessionAction(
  input: SaveTrainingSessionInput
): Promise<TrainingSessionSaveResult> {
  if (isDemoAuthEnabled()) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Training transcript persistence is unavailable in demo mode.",
    };
  }

  if (
    !input?.scenario ||
    typeof input.scenario.id !== "string" ||
    typeof input.scenario.title !== "string" ||
    typeof input.scenario.customerName !== "string" ||
    typeof input.scenario.targetProduct !== "string" ||
    !Array.isArray(input.messages) ||
    input.messages.length === 0 ||
    input.messages.length > 50 ||
    !input.messages.every(isValidMessage) ||
    !input.scorecard ||
    !Number.isInteger(input.durationSeconds) ||
    input.durationSeconds < 0 ||
    Number.isNaN(Date.parse(input.startedAt)) ||
    (input.aiSource !== null && !["gemini-flash", "openai-responses", "rule-engine"].includes(input.aiSource))
  ) {
    return { ok: false, code: "VALIDATION", message: "Training transcript data is invalid." };
  }

  const context = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const now = new Date().toISOString();

  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      workspace_id: context.workspaceId,
      operator_id: context.userId,
      scenario_id: input.scenario.id,
      scenario_title: input.scenario.title,
      customer_name: input.scenario.customerName,
      target_product: input.scenario.targetProduct,
      status: "completed",
      duration_seconds: input.durationSeconds,
      ai_source: input.aiSource,
      scorecard: input.scorecard,
      started_at: input.startedAt,
      completed_at: now,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { ok: false, code: "DATABASE", message: "Training transcript could not be saved." };
  }

  const turns = input.messages.map((message, sequenceNumber) => ({
    session_id: session.id,
    workspace_id: context.workspaceId,
    sequence_number: sequenceNumber,
    speaker: message.sender === "user" ? "operator" : "customer",
    text: message.text.trim(),
    source: message.source || (message.sender === "user" ? "typed" : "ai_customer"),
    occurred_at: message.occurredAt || now,
    confidence: message.confidence ?? null,
  }));

  const { error: turnsError } = await supabase.from("training_session_turns").insert(turns);
  if (turnsError) {
    await supabase.from("training_sessions").delete().eq("id", session.id).eq("operator_id", context.userId);
    return { ok: false, code: "DATABASE", message: "Training transcript turns could not be saved." };
  }

  return { ok: true, sessionId: session.id };
}
