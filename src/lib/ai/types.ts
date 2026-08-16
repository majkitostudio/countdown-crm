export interface CopilotAnalysisResult {
  sentiment: "Positive" | "Price Objection" | "Product Objection" | "Neutral";
  detectedObjection: string | null;
  confidenceScore: number;
  rebuttalArguments: string[];
  nextBestAction: string;
  aiSource: "gemini-flash" | "rule-engine" | "unavailable";
}

export interface EnrichedCompanyData {
  companyName: string;
  industry: string;
  estimatedEmployees: string;
  estimatedRevenue: string;
  techStack: string[];
  keyPainPoints: string;
  enrichmentSource: "gemini-flash" | "fallback-enricher";
}
