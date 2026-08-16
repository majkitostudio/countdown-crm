import "server-only";

import { AttributeDefinition, RecordEntity } from "./types";
import { analyzeTranscriptWithGemini } from "../gemini";
import { calculateAiLeadScore } from "../leads";

export interface AiAttributeComputationResult {
  attributeKey: string;
  value: unknown;
  computedAt: string;
  source: "gemini-flash" | "rule-engine";
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

  // The lead score is deterministic and explainable; it is not a Gemini result.
  if (attributeKey === "ai_score") {
    const value = calculateAiLeadScore({
      full_name: typeof record.values.full_name === "string" ? record.values.full_name : undefined,
      phone: typeof record.values.phone === "string" ? record.values.phone : undefined,
      email: typeof record.values.email === "string" ? record.values.email : undefined,
      city: typeof record.values.city === "string" ? record.values.city : undefined,
      notes: typeof record.values.notes === "string" ? record.values.notes : undefined,
    });
    return {
      attributeKey,
      value,
      computedAt: now,
      source: "rule-engine",
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
      source: analysis.aiSource === "gemini-flash" ? "gemini-flash" : "rule-engine",
    };
  }

  // Custom AI attributes need an explicit provider before they can be computed.
  return {
    attributeKey,
    value: null,
    computedAt: now,
    source: "rule-engine",
  };
}
