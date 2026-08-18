import "server-only";

import { GoogleGenAI } from "@google/genai";
import type { CopilotAnalysisResult } from "@/lib/ai/types";

export type { CopilotAnalysisResult } from "@/lib/ai/types";

/**
 * Runs Gemini 2.5 Flash model analysis on call transcript with a transparent rule-engine fallback.
 */
export async function analyzeTranscriptWithGemini(
  transcript: string,
  customerName: string = "Customer",
  productTitle: string = "Bio-Boost Anti-Aging Stack"
): Promise<CopilotAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("No GEMINI_API_KEY provided in environment, using the transparent rule engine.");
    return analyzeTranscriptWithRuleEngine(transcript);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are an expert sales AI copilot in a call center. Analyze the following live call transcript between an operator and customer "${customerName}" regarding the product "${productTitle}".

Transcript:
"${transcript}"

Provide a JSON response strictly matching this JSON schema:
{
  "sentiment": "Positive" | "Price Objection" | "Product Objection" | "Neutral",
  "detectedObjection": string or null,
  "confidenceScore": number between 70 and 99,
  "rebuttalArguments": array of 3 bullet point strings for the operator to say,
  "nextBestAction": string recommendation for the operator
}

Respond ONLY with valid JSON, no markdown code block formatting.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "";
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return {
      sentiment: parsed.sentiment || "Neutral",
      detectedObjection: parsed.detectedObjection || null,
      confidenceScore: parsed.confidenceScore || 85,
      rebuttalArguments: parsed.rebuttalArguments || [],
      nextBestAction: parsed.nextBestAction || "Continue active listening and offer product demo.",
      aiSource: "gemini-flash",
    };
  } catch (err) {
    console.warn("Gemini API call failed, using the transparent rule engine:", err);
    return analyzeTranscriptWithRuleEngine(transcript);
  }
}

/**
 * Deterministic offline analysis. It classifies conversation cues only and never invents product claims.
 */
export function analyzeTranscriptWithRuleEngine(transcript: string): CopilotAnalysisResult {
  const lower = transcript.toLowerCase();

  if (lower.includes("cena") || lower.includes("drahé") || lower.includes("expensive") || lower.includes("price") || lower.includes("kolik")) {
    return {
      sentiment: "Price Objection",
      detectedObjection: "Price concern",
      confidenceScore: 60,
      rebuttalArguments: [
        "Acknowledge the customer's price concern.",
        "Explain only the approved offer and total cost; do not invent discounts or guarantees.",
        "Ask which information would help the customer decide."
      ],
      nextBestAction: "Ask one clarifying question before discussing approved options.",
      aiSource: "rule-engine",
    };
  }

  if (lower.includes("koupím") || lower.includes("objednám") || lower.includes("order") || lower.includes("super") || lower.includes("skvělé")) {
    return {
      sentiment: "Positive",
      detectedObjection: null,
      confidenceScore: 60,
      rebuttalArguments: [
        "Confirm that the customer wants to continue.",
        "Review the approved product, price and delivery terms.",
        "Place an order only after explicit customer confirmation."
      ],
      nextBestAction: "Confirm explicit customer consent before opening checkout.",
      aiSource: "rule-engine",
    };
  }

  return {
    sentiment: "Neutral",
    detectedObjection: null,
    confidenceScore: 40,
    rebuttalArguments: [
      "Ask an open question to understand the customer's needs.",
      "Use only approved product information.",
      "Do not promise outcomes, discounts or delivery terms that are not confirmed."
    ],
    nextBestAction: "Identify the customer's need before presenting the offer.",
    aiSource: "rule-engine",
  };
}
