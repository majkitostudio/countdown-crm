"use server";

import { isDemoAuthEnabled } from "@/lib/auth/config";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { createDataClient } from "@/lib/dal/db";
import { evaluateTrainingSession, getTrainingScenario, personaliseTrainingScript, type TrainingDifficulty, type TrainingMessage, type TrainingScorecard } from "@/lib/training";

export type TrainingSessionSaveResult =
  | { ok: true; sessionId: string }
  | { ok: false; code: "UNAVAILABLE" | "DATABASE" | "VALIDATION"; message: string };

export type SaveTrainingSessionInput = {
  scriptId: string;
  difficulty: TrainingDifficulty;
  personaId: string;
  messages: TrainingMessage[];
  scorecard: TrainingScorecard;
  durationSeconds: number;
  aiSource: "gemini-flash" | "openai-responses" | "rule-engine" | null;
  startedAt: string;
  completionKey: string;
};

const validSources = new Set(["typed", "browser_speech", "ai_customer", "scenario"]);

function isValidMessage(message: TrainingMessage): boolean {
  return Boolean(message && typeof message.text === "string" && message.text.trim().length > 0 && message.text.length <= 4_000 && (message.sender === "user" || message.sender === "ai_customer") && (!message.source || validSources.has(message.source)));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function saveTrainingSessionAction(input: SaveTrainingSessionInput): Promise<TrainingSessionSaveResult> {
  if (isDemoAuthEnabled()) return { ok: false, code: "UNAVAILABLE", message: "V demo režimu nelze uložit přepis tréninkového hovoru." };
  if (!input || typeof input.scriptId !== "string" || typeof input.personaId !== "string" || !["easy", "standard"].includes(input.difficulty) || !Array.isArray(input.messages) || input.messages.length === 0 || input.messages.length > 50 || !input.messages.every(isValidMessage) || !Number.isInteger(input.durationSeconds) || input.durationSeconds < 0 || Number.isNaN(Date.parse(input.startedAt)) || !isUuid(input.completionKey) || (input.aiSource !== null && !["gemini-flash", "openai-responses", "rule-engine"].includes(input.aiSource))) {
    return { ok: false, code: "VALIDATION", message: "Údaje pro uložení tréninkového hovoru nejsou platné." };
  }

  const scenario = getTrainingScenario(input.scriptId, input.difficulty, input.personaId);
  if (!scenario) return { ok: false, code: "VALIDATION", message: "Zvolený P2 trénink není platný." };
  const scorecard = evaluateTrainingSession(scenario, input.messages);

  const context = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const now = new Date().toISOString();
  const scriptSnapshot = {
    title: scenario.title,
    productLabel: scenario.productLabel,
    difficulty: scenario.difficulty,
    customerName: scenario.customer.name,
    sections: personaliseTrainingScript(scenario),
  };

  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      workspace_id: context.workspaceId,
      operator_id: context.userId,
      scenario_id: scenario.id,
      scenario_title: scenario.title,
      customer_name: scenario.customer.name,
      target_product: scenario.productLabel,
      status: "completed",
      duration_seconds: input.durationSeconds,
      ai_source: input.aiSource,
      scorecard,
      script_snapshot: scriptSnapshot,
      completion_key: input.completionKey,
      started_at: input.startedAt,
      completed_at: now,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    if (sessionError?.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("training_sessions")
        .select("id")
        .eq("workspace_id", context.workspaceId)
        .eq("operator_id", context.userId)
        .eq("completion_key", input.completionKey)
        .maybeSingle();
      if (!existingError && existing) return { ok: true, sessionId: existing.id };
    }
    return { ok: false, code: "DATABASE", message: "Tréninkový záznam se nepodařilo uložit." };
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
    return { ok: false, code: "DATABASE", message: "Přepis tréninkového hovoru se nepodařilo uložit." };
  }
  return { ok: true, sessionId: session.id };
}
