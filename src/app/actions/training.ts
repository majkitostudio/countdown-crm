"use server";

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { TRAINING_SCENARIOS, TrainingScenario, TrainingMessage } from "@/lib/training";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export interface RoleplayAIResponse {
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  customerMood: "Klidný" | "Skeptický" | "Podrážděný" | "Nadšený" | "Naštvaný" | "Nedůvěřivý";
  patienceDelta: number; // e.g. -25 to +20
  aiSource: "gemini-flash" | "openai-responses" | "rule-engine";
  aiNotice?: string;
}

export type TrainingTurnSource = "typed" | "browser_speech";

export type SubmitTrainingTurnInput = {
  scenarioId: string;
  history: TrainingMessage[];
  userMessage: string;
  source?: TrainingTurnSource;
  confidence?: number | null;
};

export type SubmitTrainingTurnResult =
  | {
      ok: true;
      operatorTurn: {
        sequenceNumber: number;
        text: string;
        source: TrainingTurnSource;
        confidence: number | null;
      };
      customerTurn: RoleplayAIResponse & { sequenceNumber: number };
    }
  | {
      ok: false;
      code: "VALIDATION" | "UNAVAILABLE" | "PROVIDER";
      message: string;
    };

type ParsedTrainingResponse = {
  text?: unknown;
  sentiment?: unknown;
  customerMood?: unknown;
  patienceDelta?: unknown;
};

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
  const sentiments = ["positive", "neutral", "negative"] as const;
  const moods = ["Klidný", "Skeptický", "Podrážděný", "Nadšený", "Naštvaný", "Nedůvěřivý"] as const;
  const sentiment = sentiments.includes(parsed.sentiment as (typeof sentiments)[number]) ? parsed.sentiment as (typeof sentiments)[number] : "neutral";
  const customerMood = moods.includes(parsed.customerMood as (typeof moods)[number]) ? parsed.customerMood as (typeof moods)[number] : "Skeptický";
  const text = typeof parsed.text === "string" && parsed.text.trim() ? parsed.text.trim() : "Rozumím. Co přesně mi k tomu můžete ještě nabídnout?";
  const patienceDelta = typeof parsed.patienceDelta === "number" ? Math.max(-30, Math.min(20, parsed.patienceDelta)) : 0;

  return { text, sentiment, customerMood, patienceDelta, aiSource };
}

function getProviderErrorNotice(provider: "gemini" | "openai", error: unknown): string {
  if (error instanceof Error && error.message === "TRAINING_PROVIDER_TIMEOUT") {
    return `${provider === "gemini" ? "Gemini" : "OpenAI"} response timed out. This turn used the local training engine.`;
  }
  const errorStatus = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  if (errorStatus === 429) return `${provider === "gemini" ? "Gemini" : "OpenAI"} quota is unavailable. This turn used the local training engine.`;
  return `${provider === "gemini" ? "Gemini" : "OpenAI"} response was unavailable. This turn used the local training engine.`;
}

export async function generateTrainingResponseAction(
  scenario: TrainingScenario,
  history: TrainingMessage[],
  userMessage: string
): Promise<RoleplayAIResponse> {
  await requireAuthenticatedUser();

  if (
    !scenario ||
    typeof scenario !== "object" ||
    typeof scenario.id !== "string" ||
    typeof scenario.customerName !== "string" ||
    typeof scenario.customerPersona !== "string" ||
    typeof scenario.personalityType !== "string" ||
    typeof scenario.targetProduct !== "string" ||
    !Array.isArray(history)
  ) {
    throw new Error("Invalid training request");
  }

  const normalizedMessage = userMessage?.trim() ?? "";
  if (normalizedMessage.length === 0 || normalizedMessage.length > 4_000) {
    throw new Error("Training message is invalid or too long");
  }

  if (
    history.length > 50 ||
    history.some(
      (message) =>
        !message ||
        typeof message !== "object" ||
        !["user", "ai_customer"].includes(message.sender) ||
        typeof message.text !== "string" ||
        message.text.length > 4_000
    )
  ) {
    throw new Error("Training history is invalid or too long");
  }

  const provider = process.env.TRAINING_AI_PROVIDER === "openai" ? "openai" : "gemini";
  const historyFormatted = history
    .map((m) => `${m.sender === "user" ? "Operátor" : scenario.customerName}: ${m.text}`)
    .join("\n");
  const prompt = `
Jsi český zákazník v simulovaném prodejním hovoru s operátorem call centra.
Tvoje jméno a profil: ${scenario.customerName} (${scenario.customerPersona})
Tvoje osobnost: ${scenario.personalityType}
Cílový produkt hovoru: ${scenario.targetProduct}

Historie konverzace:
${historyFormatted}

Poslední odpověď operátora:
        "${normalizedMessage}"

Tvůj úkol: Odpověz operátorovi přirozeným mluveným českým jazykem v délce 1 až 2 věty přesně podle tvé osobnosti (${scenario.personalityType}).
Vyhodnoť také svoji aktuální náladu a změnu trpělivosti (patienceDelta od -30 do +20).
Pokud operátor kvalitně vyřešil námitku nebo projevil empatii, zvyš trpělivost (+10 až +20) a nastav náladu na "Klidný" nebo "Nadšený".
Pokud operátor kličkuje, ignoruje otázku nebo je agresivní, sniž trpělivost (-15 až -30) a nastav náladu na "Podrážděný" nebo "Naštvaný".

Vrať ODPOVĚĎ v tomto JSON formátu:
{
  "text": "Tvoje česká odpověď zákazníka (max 2 věty)",
  "sentiment": "positive" | "neutral" | "negative",
  "customerMood": "Klidný" | "Skeptický" | "Podrážděný" | "Nadšený" | "Naštvaný" | "Nedůvěřivý",
  "patienceDelta": číslo v rozmezí -30 až +20
}

Odpověz POUZE platným JSON objektem bez označení markdown kódu.
`;
  const providerOrder = provider === "gemini" ? ["gemini", "openai"] as const : ["openai", "gemini"] as const;
  let aiNotice: string | undefined;

  for (const currentProvider of providerOrder) {
    try {
      if (currentProvider === "gemini" && process.env.GEMINI_API_KEY) {
        const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await withTrainingProviderTimeout(client.interactions.create({
          model: process.env.GEMINI_TRAINING_MODEL || "gemini-3.6-flash",
          input: prompt,
          store: false,
        }));
        const cleanJson = (response.output_text || "").replace(/```json|```/g, "").trim();
        return normalizeTrainingResponse(JSON.parse(cleanJson) as ParsedTrainingResponse, "gemini-flash");
      }

      if (currentProvider === "openai" && process.env.OPENAI_API_KEY) {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await withTrainingProviderTimeout(client.responses.create({
          model: process.env.OPENAI_TRAINING_MODEL || "gpt-5.4-mini",
          input: prompt,
          text: {
            format: {
              type: "json_schema",
              name: "training_customer_response",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  text: { type: "string" },
                  sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                  customerMood: { type: "string", enum: ["Klidný", "Skeptický", "Podrážděný", "Nadšený", "Naštvaný", "Nedůvěřivý"] },
                  patienceDelta: { type: "number", minimum: -30, maximum: 20 },
                },
                required: ["text", "sentiment", "customerMood", "patienceDelta"],
              },
            },
          },
        }));
        return normalizeTrainingResponse(JSON.parse(response.output_text) as ParsedTrainingResponse, "openai-responses");
      }
    } catch (error) {
      aiNotice = getProviderErrorNotice(currentProvider, error);
      console.warn(`${currentProvider} training response failed; trying the next provider or local engine:`, error);
    }
  }

  // Local fallback engine
  const lowerUser = normalizedMessage.toLowerCase();
  let text = "Rozumím. Co dalšího mi k tomu můžete říct?";
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  let customerMood: RoleplayAIResponse["customerMood"] = "Skeptický";
  let patienceDelta = 0;

  if (scenario.id === "supplements-skeptic") {
    if (lowerUser.includes("hydrolyzovaný") || lowerUser.includes("vstřebatelnost") || lowerUser.includes("studie")) {
      text = "Aha, vy říkáte, že hydrolyzovaný se vstřebává lépe? To zní rozumně. A za jak dlouho ucítím úlevu?";
      sentiment = "positive";
      customerMood = "Klidný";
      patienceDelta = +15;
    } else if (lowerUser.includes("trojbalení") || lowerUser.includes("sleva") || lowerUser.includes("akce")) {
      text = "Když vezmu to trojbalení, mám dopravu zdarma? A co když mi to nepomůže?";
      sentiment = "neutral";
      customerMood = "Skeptický";
      patienceDelta = +5;
    } else if (lowerUser.includes("záruka") || lowerUser.includes("vrácení") || lowerUser.includes("14 dnů")) {
      text = "Dobrá tedy, přesvědčil jste mě. Dáme to trojbalení s garancí. Kam mám poslat adresu?";
      sentiment = "positive";
      customerMood = "Nadšený";
      patienceDelta = +20;
    } else {
      text = "No nevím... všichni tvrdíte to samé. Co je na tom vašem produktu konkrétně jiné než u těch z lékárny?";
      sentiment = "negative";
      customerMood = "Podrážděný";
      patienceDelta = -15;
    }
  } else if (scenario.id === "cosmetics-price") {
    if (lowerUser.includes("denně") || lowerUser.includes("korun") || lowerUser.includes("21")) {
      text = "Když to přepočítáte na 20 korun denně, tak to zní stravitelněji... A opravdu k tomu dáváte tu masku zdarma?";
      sentiment = "positive";
      customerMood = "Nadšený";
      patienceDelta = +15;
    } else if (lowerUser.includes("dárek") || lowerUser.includes("maska") || lowerUser.includes("zdarma")) {
      text = "To zní lákavě. Mám ráda dárky k nákupu. Platí se předem nebo na dobírku?";
      sentiment = "positive";
      customerMood = "Klidný";
      patienceDelta = +10;
    } else {
      text = "Vnímám to, ale pořád je to dost peněz najednou. Máte k tomu nějaký vzorek nebo zvýhodnění?";
      sentiment = "neutral";
      customerMood = "Skeptický";
      patienceDelta = -5;
    }
  } else if (scenario.id === "electronics-angry") {
    if (lowerUser.includes("servis") || lowerUser.includes("záruka") || lowerUser.includes("lidar")) {
      text = "Český servis s náhradním strojem při reklamaci? To u konkurence nedostanu. Jaká je doručovací lhůta?";
      sentiment = "positive";
      customerMood = "Klidný";
      patienceDelta = +20;
    } else if (lowerUser.includes("zítra") || lowerUser.includes("dnes") || lowerUser.includes("ihned")) {
      text = "Pokud mi to doručíte zítra do dopoledne, tak to beru. Pošlete mi potvrzení do mailu.";
      sentiment = "positive";
      customerMood = "Nadšený";
      patienceDelta = +20;
    } else {
      text = "Nekličkujte a pojďte k věci. Proč LiDAR a ne kamera?";
      sentiment = "negative";
      customerMood = "Naštvaný";
      patienceDelta = -20;
    }
  } else if (scenario.id === "cosmetics-distrustful") {
    if (lowerUser.includes("certifikát") || lowerUser.includes("iso") || lowerUser.includes("gmp") || lowerUser.includes("výroba") || lowerUser.includes("české")) {
      text = "Česká šarže s ISO certifikátem? To už zní trochu důvěryhodněji. Můžete mi ten certifikát poslat do mailu?";
      sentiment = "positive";
      customerMood = "Klidný";
      patienceDelta = +20;
    } else if (lowerUser.includes("dobírka") || lowerUser.includes("platba při převzetí") || lowerUser.includes("kurýr")) {
      text = "Když to můžu zaplatit až kurýrovi při převzetí na dobírku, tak je to v pořádku. Vezmu 2 balení pro mě i pro sestru!";
      sentiment = "positive";
      customerMood = "Nadšený";
      patienceDelta = +25;
    } else {
      text = "Pořád se mi to nezdá. Kde mám jistotu, že to není z falšovaných surovin?";
      sentiment = "negative";
      customerMood = "Nedůvěřivý";
      patienceDelta = -15;
    }
  }

  return {
    text,
    sentiment,
    customerMood,
    patienceDelta,
    aiSource: "rule-engine",
    aiNotice,
  };
}

/**
 * Submit one operator turn against a server-canonical training scenario.
 * This intentionally remains session-only: it does not create CRM or
 * training-session persistence records. Persistence remains an explicit
 * completion step until the live-turn contract is separately approved.
 */
export async function submitTrainingTurnAction(
  input: SubmitTrainingTurnInput
): Promise<SubmitTrainingTurnResult> {
  await requireAuthenticatedUser();

  if (
    !input ||
    typeof input.scenarioId !== "string" ||
    !Array.isArray(input.history) ||
    typeof input.userMessage !== "string" ||
    (input.source !== undefined && !["typed", "browser_speech"].includes(input.source)) ||
    (input.confidence !== undefined &&
      input.confidence !== null &&
      (typeof input.confidence !== "number" || input.confidence < 0 || input.confidence > 1))
  ) {
    return { ok: false, code: "VALIDATION", message: "Training turn data is invalid." };
  }

  const scenario = TRAINING_SCENARIOS.find((candidate) => candidate.id === input.scenarioId);
  if (!scenario) {
    return { ok: false, code: "VALIDATION", message: "Training scenario is invalid." };
  }

  const source = input.source || "typed";
  const confidence = input.confidence ?? null;
  const userMessage = input.userMessage.trim();
  if (!userMessage || userMessage.length > 4_000) {
    return { ok: false, code: "VALIDATION", message: "Training message is invalid or too long." };
  }

  try {
    const customerResponse = await generateTrainingResponseAction(scenario, input.history, userMessage);
    return {
      ok: true,
      operatorTurn: {
        sequenceNumber: input.history.length,
        text: userMessage,
        source,
        confidence,
      },
      customerTurn: {
        ...customerResponse,
        sequenceNumber: input.history.length + 1,
      },
    };
  } catch (error) {
    console.error("Training turn submission failed:", error);
    return { ok: false, code: "PROVIDER", message: "Training customer response is unavailable." };
  }
}
