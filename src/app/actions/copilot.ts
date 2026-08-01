"use server";

import { analyzeTranscriptWithGemini, CopilotAnalysisResult } from "@/lib/gemini";

/**
 * Next.js Server Action: Analyzes call transcript using Gemini 2.5 Flash API
 */
export async function analyzeCallTranscriptAction(
  transcript: string,
  customerName?: string,
  productTitle?: string
): Promise<CopilotAnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    return {
      sentiment: "Neutral",
      detectedObjection: null,
      confidenceScore: 50,
      rebuttalArguments: [
        "Awaiting customer response...",
        "Listen actively to identify customer needs."
      ],
      nextBestAction: "Greet customer and ask open-ended question.",
      aiSource: "fallback-engine"
    };
  }

  return await analyzeTranscriptWithGemini(
    transcript,
    customerName || "Customer",
    productTitle || "Bio-Boost Anti-Aging Stack"
  );
}
