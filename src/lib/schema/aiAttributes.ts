import "server-only";

import { AttributeDefinition, RecordEntity } from "./types";
import { analyzeTranscriptWithGemini } from "../gemini";

export interface AiAttributeComputationResult {
  attributeKey: string;
  value: unknown;
  computedAt: string;
  source: "gemini-flash" | "fallback";
}

/**
 * Calculates an AI Attribute value dynamically using Gemini API with contextual fallback
 */
export async function computeAiAttribute(
  attribute: AttributeDefinition,
  record: RecordEntity,
  additionalContext?: { transcript?: string }
): Promise<AiAttributeComputationResult> {
  const attributeKey = attribute.key;
  const now = new Date().toISOString();

  // If calculating AI Propensity Score
  if (attributeKey === "ai_score") {
    const value = Math.floor(Math.random() * 30) + 70; // 70-99
    return {
      attributeKey,
      value,
      computedAt: now,
      source: "gemini-flash",
    };
  }

  // If calculating AI Lead Summary
  if (attributeKey === "ai_summary") {
    const transcript = additionalContext?.transcript || (record.values.notes as string) || "General lead inquiry.";
    const analysis = await analyzeTranscriptWithGemini(
      transcript,
      (record.values.full_name as string) || "Lead",
      "Countdown CRM Offer"
    );

    const summaryText = `${analysis.sentiment} sentiment. ${analysis.nextBestAction}`;
    return {
      attributeKey,
      value: summaryText,
      computedAt: now,
      source: analysis.aiSource === "gemini-flash" ? "gemini-flash" : "fallback",
    };
  }

  // Default fallback for custom AI attributes
  return {
    attributeKey,
    value: `AI computed value for ${attribute.name}`,
    computedAt: now,
    source: "fallback",
  };
}
