import "server-only";

import { GoogleGenAI } from "@google/genai";
import {
  buildCallQualityPrompt,
  normalizeGeminiCallQualityResult,
  type CallQualityInput,
  type GeminiCallQualityResult,
} from "@/lib/callQualityReview";

const QUALITY_PROVIDER_TIMEOUT_MS = 8_000;

export class GeminiCallQualityError extends Error {
  readonly code: "MISSING_API_KEY" | "TIMEOUT" | "INVALID_RESPONSE" | "PROVIDER";

  constructor(code: GeminiCallQualityError["code"], message: string) {
    super(message);
    this.name = "GeminiCallQualityError";
    this.code = code;
  }
}

async function withTimeout<T>(request: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, QUALITY_PROVIDER_TIMEOUT_MS);

  try {
    return await request(controller.signal);
  } catch (error) {
    if (timedOut) {
      throw new GeminiCallQualityError("TIMEOUT", "Gemini quality review timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

const QUALITY_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendation: { type: "string", enum: ["ok", "review"] },
    missing_sections: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "client_problems",
          "discovered_information",
          "client_goal",
          "offers_and_prices",
          "offer_reactions",
          "outcome_and_next_step",
        ],
      },
    },
    reasons: { type: "array", items: { type: "string" }, maxItems: 6 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["recommendation", "missing_sections", "reasons", "confidence"],
} as const;

export async function evaluateCallQualityWithGemini(input: CallQualityInput): Promise<GeminiCallQualityResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiCallQualityError("MISSING_API_KEY", "Gemini quality review is not configured.");
  }

  const client = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_QUALITY_MODEL?.trim() || "gemini-3.6-flash";

  try {
    const response = await withTimeout((abortSignal) => client.models.generateContent({
      model,
      contents: buildCallQualityPrompt(input),
      config: {
        abortSignal,
        temperature: 0,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
        responseJsonSchema: QUALITY_RESPONSE_SCHEMA,
      },
    }));

    const rawText = typeof response.text === "string" ? response.text.trim() : "";
    if (!rawText) throw new GeminiCallQualityError("INVALID_RESPONSE", "Gemini returned an empty quality review.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new GeminiCallQualityError("INVALID_RESPONSE", "Gemini returned invalid quality review JSON.");
    }

    const result = normalizeGeminiCallQualityResult(parsed);
    if (!result) throw new GeminiCallQualityError("INVALID_RESPONSE", "Gemini returned an invalid quality review shape.");
    return result;
  } catch (error) {
    if (error instanceof GeminiCallQualityError) throw error;
    throw new GeminiCallQualityError("PROVIDER", "Gemini quality review failed.");
  }
}
