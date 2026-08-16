"use server";

import { analyzeTranscriptWithGemini } from "@/lib/gemini";
import type { CopilotAnalysisResult } from "@/lib/ai/types";
import { requireAuthenticatedUser } from "@/lib/auth/server";

/**
 * Next.js Server Action: Analyzes call transcript using Gemini 2.5 Flash API
 */
export async function analyzeCallTranscriptAction(
  transcript: string,
  customerName?: string,
  productTitle?: string
): Promise<CopilotAnalysisResult> {
  await requireAuthenticatedUser();

  const normalizedTranscript = transcript?.trim() ?? "";
  if (normalizedTranscript.length > 12_000) {
    throw new Error("Transcript is too long");
  }

  const normalizedCustomerName = customerName?.trim() || "Unknown customer";
  const normalizedProductTitle = productTitle?.trim() || "Unknown product";

  if (normalizedCustomerName.length > 200 || normalizedProductTitle.length > 200) {
    throw new Error("Invalid transcript context");
  }

  if (normalizedTranscript.length === 0) {
    return {
      sentiment: "Neutral",
      detectedObjection: null,
      confidenceScore: 50,
      rebuttalArguments: [
        "Awaiting customer response...",
        "Listen actively to identify customer needs."
      ],
      nextBestAction: "Greet customer and ask open-ended question.",
      aiSource: "unavailable"
    };
  }

  return await analyzeTranscriptWithGemini(
    normalizedTranscript,
    normalizedCustomerName,
    normalizedProductTitle
  );
}
