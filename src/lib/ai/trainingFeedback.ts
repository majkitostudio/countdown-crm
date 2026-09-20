import "server-only";

import { GoogleGenAI } from "@google/genai";
import type { TrainingScenario, TrainingMessage, TrainingFeedback } from "@/lib/training";
import { findComplianceFindings } from "@/lib/training";

const TRAINING_FEEDBACK_TIMEOUT_MS = 12_000;

export class TrainingFeedbackError extends Error {
  readonly code: "MISSING_API_KEY" | "TIMEOUT" | "INVALID_RESPONSE" | "PROVIDER";

  constructor(code: TrainingFeedbackError["code"], message: string) {
    super(message);
    this.name = "TrainingFeedbackError";
    this.code = code;
  }
}

const FEEDBACK_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    feedback: {
      type: "array",
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["objection", "direction", "closing", "compliance", "other"] },
          operator_text: { type: "string" },
          suggested_text: { type: "string" },
          reason: { type: "string" },
          severity: { type: "string", enum: ["critical", "warning", "info"] },
        },
        required: ["type", "operator_text", "suggested_text", "reason", "severity"],
      },
    },
  },
  required: ["feedback"],
} as const;

function buildFeedbackPrompt(scenario: TrainingScenario, history: TrainingMessage[]): string {
  const complianceFindings = findComplianceFindings(history);
  const operatorMessages = history.filter((m) => m.sender === "user").map((m) => m.text).join("\n---\n");

  return `
Jsi AI coaching asistent pro P2 outbound trénink (Countdown CRM).
Analyzuj přepis tréninkového hovoru a vrať konkrétní opravy.

SKRIPT (pouze pro orientaci):
${scenario.title} – ${scenario.productLabel}
${scenario.sections.map((s) => `${s.title}: ${s.text}`).join("\n")}

ZÁKAZNÍK: ${scenario.customer.name} – ${scenario.customer.profile}
OBTÍŽNOST: ${scenario.difficulty === "easy" ? "snadná" : "standardní"}

PŘEPROS OPERÁTORA:
${operatorMessages || "(prázdný)"}

COMPLIANCE NÁLEZY (uzavřené, jen pro kontext):
${complianceFindings.length > 0 ? complianceFindings.map((f) => `- ${f.reason}: "${f.phrase}" → ${f.saferAlternative}`).join("\n") : "žádné"}

ÚKOL:
Vrať až 7 konkrétních oprav, kde operátor mohl reagovat lépe. Zaměř se na:
1. OBJECTION HANDLING – klient dal námitku, operátor zvolil špatný argument nebo ignoroval
2. SMĚR HOVORU – operátor se vydal úplně jiným směrem než skript
3. ZÁVĚR – chyběla ověřená adresa, neděkování, neshrnutí
4. COMPLIANCE – slib účinku, vydávání se za lékaře, garance (uzavřeno výše)
5. OTHER – jiné zásadní chyby

NEVRAŤ:
- Kontrolu slovo od slova podle skriptu
- Body, skóre, známky, passed/failed
- Obecné rady typu "zlepšete komunikaci"

FORMÁT (pouze validní JSON):
{
  "feedback": [
    {
      "type": "objection|direction|closing|compliance|other",
      "operator_text": "přesná věta operátora",
      "suggested_text": "jak to mělo znít správně",
      "reason": "proč to bylo špatně",
      "severity": "critical|warning|info"
    }
  ]
}

Pokud není co opravit, vrať prázdné pole "feedback": [].
`;
}

export async function generateTrainingFeedback(
  scenario: TrainingScenario,
  history: TrainingMessage[]
): Promise<TrainingFeedback[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Training feedback is not configured (GEMINI_API_KEY missing).");
  }

  const client = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_TRAINING_MODEL?.trim() || "gemini-3.6-flash";

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TRAINING_FEEDBACK_TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model,
      contents: buildFeedbackPrompt(scenario, history),
      config: {
        abortSignal: controller.signal,
        temperature: 0,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
        responseJsonSchema: FEEDBACK_RESPONSE_SCHEMA,
      },
    });

    const rawText = typeof response.text === "string" ? response.text.trim() : "";
    if (!rawText) throw new Error("AI returned empty feedback.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error("AI returned invalid feedback JSON.");
    }

    const result = parsed as { feedback: Array<{ type: string; operator_text: string; suggested_text: string; reason: string; severity: string }> };
    if (!result || !Array.isArray(result.feedback)) {
      throw new Error("AI returned invalid feedback shape.");
    }

    return result.feedback.map((item) => ({
      type: item.type as TrainingFeedback["type"],
      operatorText: item.operator_text,
      suggestedText: item.suggested_text,
      reason: item.reason,
      severity: item.severity as TrainingFeedback["severity"],
    }));
  } catch (error) {
    if (timedOut) throw new Error("Training feedback generation timed out.");
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}