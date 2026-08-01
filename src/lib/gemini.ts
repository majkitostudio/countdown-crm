import { GoogleGenAI } from "@google/genai";

export interface CopilotAnalysisResult {
  sentiment: "Positive" | "Price Objection" | "Product Objection" | "Neutral";
  detectedObjection: string | null;
  confidenceScore: number;
  rebuttalArguments: string[];
  nextBestAction: string;
  aiSource: "gemini-flash" | "fallback-engine";
}

/**
 * Runs Gemini 2.5 Flash model analysis on call transcript with fallback engine
 */
export async function analyzeTranscriptWithGemini(
  transcript: string,
  customerName: string = "Customer",
  productTitle: string = "Bio-Boost Anti-Aging Stack"
): Promise<CopilotAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("No GEMINI_API_KEY provided in environment, using intelligent fallback engine.");
    return generateFallbackAnalysis(transcript, productTitle);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are an expert sales AI copilot in a call center. Analyze the following live call transcript between an agent and customer "${customerName}" regarding the product "${productTitle}".

Transcript:
"${transcript}"

Provide a JSON response strictly matching this JSON schema:
{
  "sentiment": "Positive" | "Price Objection" | "Product Objection" | "Neutral",
  "detectedObjection": string or null,
  "confidenceScore": number between 70 and 99,
  "rebuttalArguments": array of 3 bullet point strings for the agent to say,
  "nextBestAction": string recommendation for the agent
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
    console.warn("Gemini API call failed, falling back to rule engine:", err);
    return generateFallbackAnalysis(transcript, productTitle);
  }
}

/**
 * Intelligent Fallback Engine when Gemini API key is not configured
 */
export function generateFallbackAnalysis(
  transcript: string,
  productTitle: string
): CopilotAnalysisResult {
  const lower = transcript.toLowerCase();

  if (lower.includes("cena") || lower.includes("drahé") || lower.includes("expensive") || lower.includes("price") || lower.includes("kolik")) {
    return {
      sentiment: "Price Objection",
      detectedObjection: "Customer perceives price as high",
      confidenceScore: 92,
      rebuttalArguments: [
        `Highlight liposomal bioavailability of ${productTitle} (up to 800% higher absorption).`,
        "Offer 3-month supply bundle discount which lowers monthly cost by 25%.",
        "Emphasize 30-day money-back guarantee with zero risk."
      ],
      nextBestAction: "Offer 15% VIP Closing discount or 3-month bundle plan.",
      aiSource: "fallback-engine",
    };
  }

  if (lower.includes("koupím") || lower.includes("objednám") || lower.includes("order") || lower.includes("super") || lower.includes("skvělé")) {
    return {
      sentiment: "Positive",
      detectedObjection: null,
      confidenceScore: 96,
      rebuttalArguments: [
        "Confirm customer shipping address and payment method.",
        "Suggest adding complimentary skincare serum to increase order value.",
        "Thank customer and reassure 24h dispatch time."
      ],
      nextBestAction: "Click 'Place Order' button immediately in right panel.",
      aiSource: "fallback-engine",
    };
  }

  return {
    sentiment: "Neutral",
    detectedObjection: "General product inquiry",
    confidenceScore: 80,
    rebuttalArguments: [
      `Explain main active ingredients and benefits of ${productTitle}.`,
      "Ask customer about their primary health / beauty goals.",
      "Share customer review quotes and clinical test results."
    ],
    nextBestAction: "Identify customer pain point before proposing price.",
    aiSource: "fallback-engine",
  };
}
