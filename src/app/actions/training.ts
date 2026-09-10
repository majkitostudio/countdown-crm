"use server";

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { findComplianceFindings, getTrainingScenario, type TrainingDifficulty, type TrainingMessage, type TrainingScenario } from "@/lib/training";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export type TrainingTurnSource = "typed" | "browser_speech";

export interface RoleplayAIResponse {
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  aiSource: "gemini-flash" | "openai-responses" | "rule-engine";
  aiNotice?: string;
}

export type SubmitTrainingTurnInput = {
  scriptId: string;
  difficulty: TrainingDifficulty;
  personaId: string;
  history: TrainingMessage[];
  userMessage: string;
  source?: TrainingTurnSource;
  confidence?: number | null;
};

export type SubmitTrainingTurnResult =
  | { ok: true; operatorTurn: { sequenceNumber: number; text: string; source: TrainingTurnSource; confidence: number | null }; customerTurn: RoleplayAIResponse & { sequenceNumber: number } }
  | { ok: false; code: "VALIDATION" | "UNAVAILABLE" | "PROVIDER"; message: string };

type ParsedTrainingResponse = { text?: unknown; sentiment?: unknown };
const TRAINING_PROVIDER_TIMEOUT_MS = 12_000;

async function withTrainingProviderTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("TRAINING_PROVIDER_TIMEOUT")), TRAINING_PROVIDER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function normalizeTrainingResponse(parsed: ParsedTrainingResponse, aiSource: "gemini-flash" | "openai-responses"): RoleplayAIResponse {
  const sentiment = ["positive", "neutral", "negative"].includes(parsed.sentiment as string)
    ? parsed.sentiment as RoleplayAIResponse["sentiment"]
    : "neutral";
  const text = typeof parsed.text === "string" && parsed.text.trim()
    ? parsed.text.trim().slice(0, 1_200)
    : "Rozumím. Můžete mi prosím říct ještě trochu víc?";
  return { text, sentiment, aiSource };
}

function providerNotice(provider: "gemini" | "openai", error: unknown): string {
  if (error instanceof Error && error.message === "TRAINING_PROVIDER_TIMEOUT") return "Odpověď AI zákazníka se opozdila; tento tah dokončil lokální tréninkový režim.";
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  if (status === 429) return "AI zákazník je nyní vytížený; tento tah dokončil lokální tréninkový režim.";
  return `${provider === "gemini" ? "Gemini" : "OpenAI"} není pro tento tah dostupný; pokračujeme bezpečným lokálním režimem.`;
}

function buildPrompt(scenario: TrainingScenario, history: TrainingMessage[], userMessage: string): string {
  const findings = findComplianceFindings([...history, { id: "latest", sender: "user", text: userMessage, timestamp: "", source: "typed" }]);
  const repeatedSeriousError = findings.some((finding) => finding.occurrences >= 2);
  const historyFormatted = history.map((message) => `${message.sender === "user" ? "Operátor" : scenario.customer.name}: ${message.text}`).join("\n");
  return `
Jsi ${scenario.customer.name}, fiktivní český zákazník v interním P2 tréninku Countdown CRM.
Profil zákazníka: ${scenario.customer.profile}
Téma: ${scenario.productLabel}
Obtížnost: ${scenario.difficulty === "easy" ? "snadná" : "standardní"}.
Bezpečná fiktivní adresa, kterou sdělíš pouze po přirozeném souhlasu s nabídkou a dotazu na doručení: ${scenario.customer.deliveryAddress}.

Pravidla chování:
- Mluv přirozeně česky, vždy nejvýše dvě věty. Jsi zákazník, ne hodnotitel ani lékař.
- Na jednoduché otázky o potížích odpovídej běžně a stručně. Nevyžaduj medicínské tvrzení.
- Při snadné obtížnosti po slušném zjištění potřeb a vysvětlení nabídky postupně souhlas s bezplatným vzorkem.
- Při standardní obtížnosti nejdřív jednou přirozeně zapochybuj nebo se zeptej na praktický detail, pak při férovém vysvětlení souhlas.
- Jediná závažná chyba operátora (slib účinku, vydávání se za lékaře, garance) se NIKDY neprojeví ve tvé reakci. Je odděleně vyhodnocena systémem.
- Teprve opakovaná závažná chyba může snížit důvěru. Aktuální opakovaná závažná chyba: ${repeatedSeriousError ? "ano" : "ne"}.
- Nikdy nevytvářej objednávku, platbu, callback ani skutečný kontakt. Adresa je výhradně fiktivní.

Historie:
${historyFormatted}

Poslední věta operátora:
"${userMessage}"

Vrať pouze validní JSON:
{"text":"odpověď zákazníka", "sentiment":"positive"|"neutral"|"negative"}`;
}

async function generateTrainingResponseAction(scenario: TrainingScenario, history: TrainingMessage[], userMessage: string): Promise<RoleplayAIResponse> {
  const prompt = buildPrompt(scenario, history, userMessage);
  const primary = process.env.TRAINING_AI_PROVIDER === "openai" ? "openai" : "gemini";
  const providers = primary === "openai" ? ["openai", "gemini"] as const : ["gemini", "openai"] as const;
  let aiNotice: string | undefined;

  for (const provider of providers) {
    try {
      if (provider === "gemini" && process.env.GEMINI_API_KEY) {
        const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await withTrainingProviderTimeout(client.interactions.create({ model: process.env.GEMINI_TRAINING_MODEL || "gemini-3.6-flash", input: prompt, store: false }));
        return { ...normalizeTrainingResponse(JSON.parse((response.output_text || "").replace(/```json|```/g, "").trim()), "gemini-flash"), aiNotice };
      }
      if (provider === "openai" && process.env.OPENAI_API_KEY) {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await withTrainingProviderTimeout(client.responses.create({
          model: process.env.OPENAI_TRAINING_MODEL || "gpt-5.4-mini",
          input: prompt,
          text: { format: { type: "json_schema", name: "p2_training_customer", strict: true, schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" }, sentiment: { type: "string", enum: ["positive", "neutral", "negative"] } }, required: ["text", "sentiment"] } } },
        }));
        return { ...normalizeTrainingResponse(JSON.parse(response.output_text), "openai-responses"), aiNotice };
      }
    } catch (error) {
      aiNotice = providerNotice(provider, error);
      console.warn(`${provider} training response failed; continuing with the next safe option.`, error);
    }
  }

  const lower = userMessage.toLocaleLowerCase("cs-CZ");
  const operatorTurns = history.filter((message) => message.sender === "user").length + 1;
  const asksForAddress = /(adresa|doruč|kam.*poslat|bydliště)/.test(lower);
  const presentsOffer = /(vzorek|nabíz|poslat|zdarma)/.test(lower);
  const asksAboutNeeds = /(jak dlouho|omezuje|v čem|co by se změnilo)/.test(lower);
  const response = asksForAddress
    ? `Ano, můžete si poznamenat: ${scenario.customer.deliveryAddress}.`
    : presentsOffer && (scenario.difficulty === "easy" || operatorTurns >= 3)
      ? "Dobře, bezplatný vzorek bych ráda vyzkoušela. Co ode mě potřebujete pro doručení?"
      : asksAboutNeeds
        ? "Řeším to už nějakou dobu a při běžném pohybu mě to omezuje. Proto mě zajímá, jestli je vzorek opravdu jen na vyzkoušení."
        : scenario.difficulty === "standard" && operatorTurns <= 2
          ? "Rozumím, ale nechci žádné velké sliby. Jak to bude prakticky probíhat?"
          : "Dobře, rozumím. Můžete pokračovat?";
  return { text: response, sentiment: response.includes("Dobře") || response.includes("Ano") ? "positive" : "neutral", aiSource: "rule-engine", aiNotice };
}

export async function submitTrainingTurnAction(input: SubmitTrainingTurnInput): Promise<SubmitTrainingTurnResult> {
  await requireAuthenticatedUser();
  if (!input || typeof input.scriptId !== "string" || typeof input.personaId !== "string" || !Array.isArray(input.history) || typeof input.userMessage !== "string" || !["easy", "standard"].includes(input.difficulty) || (input.source !== undefined && !["typed", "browser_speech"].includes(input.source)) || (input.confidence !== undefined && input.confidence !== null && (typeof input.confidence !== "number" || input.confidence < 0 || input.confidence > 1))) {
    return { ok: false, code: "VALIDATION", message: "Údaje tréninkového tahu nejsou platné." };
  }
  const scenario = getTrainingScenario(input.scriptId, input.difficulty, input.personaId);
  const userMessage = input.userMessage.trim();
  if (!scenario || !userMessage || userMessage.length > 4_000 || input.history.length > 50 || input.history.some((message) => !message || !["user", "ai_customer"].includes(message.sender) || typeof message.text !== "string" || message.text.length > 4_000)) {
    return { ok: false, code: "VALIDATION", message: "Údaje tréninkového hovoru nejsou platné." };
  }
  try {
    const customerTurn = await generateTrainingResponseAction(scenario, input.history, userMessage);
    return { ok: true, operatorTurn: { sequenceNumber: input.history.length, text: userMessage, source: input.source || "typed", confidence: input.confidence ?? null }, customerTurn: { ...customerTurn, sequenceNumber: input.history.length + 1 } };
  } catch (error) {
    console.error("Training turn submission failed:", error);
    return { ok: false, code: "PROVIDER", message: "AI zákazník pro tento tah není dostupný." };
  }
}
