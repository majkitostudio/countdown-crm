"use server";

import { requireAuthenticatedUser } from "@/lib/auth/server";
import { getTrainingScenario, type TrainingDifficulty, type TrainingMessage, type TrainingFeedback } from "@/lib/training";
import { generateTrainingFeedback } from "@/lib/ai/trainingFeedback";

export async function generateTrainingFeedbackAction(input: {
  scriptId: string;
  difficulty: TrainingDifficulty;
  personaId: string;
  history: TrainingMessage[];
}): Promise<{ ok: true; feedback: TrainingFeedback[] } | { ok: false; code: "VALIDATION" | "UNAVAILABLE" | "PROVIDER"; message: string }> {
  await requireAuthenticatedUser();
  if (!input || typeof input.scriptId !== "string" || typeof input.personaId !== "string" || !Array.isArray(input.history) || typeof input.difficulty !== "string" || !["easy", "standard"].includes(input.difficulty) || input.history.length > 50 || input.history.some((message) => !message || !["user", "ai_customer"].includes(message.sender) || typeof message.text !== "string" || message.text.length > 4_000)) {
    return { ok: false, code: "VALIDATION", message: "Údaje pro vygenerování zpětné vazby nejsou platné." };
  }

  const scenario = getTrainingScenario(input.scriptId, input.difficulty, input.personaId);
  if (!scenario) return { ok: false, code: "VALIDATION", message: "Zvolený P2 trénink není platný." };

  try {
    const feedback = await generateTrainingFeedback(scenario, input.history);
    return { ok: true, feedback };
  } catch (error) {
    console.error("Training feedback generation failed:", error);
    return { ok: false, code: "PROVIDER", message: "Generování coachingové zpětné vazby selhalo." };
  }
}