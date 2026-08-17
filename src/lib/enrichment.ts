import "server-only";

/**
 * Gemini Automatic Company & Lead Data Enrichment Engine
 *
 * Enriches lead and company profiles using Google Gemini 2.5 Flash API
 * to derive industry, company size, key products, and intent signals.
 */

import { GoogleGenAI } from "@google/genai";
import { Lead } from "./leads";
import type { EnrichedCompanyData } from "@/lib/ai/types";

export type { EnrichedCompanyData } from "@/lib/ai/types";

/**
 * Enriches company and lead profile using Gemini 2.5 Flash API
 */
export async function enrichLeadWithGemini(
  lead: Partial<Lead>
): Promise<EnrichedCompanyData> {
  const companyName = lead.company || lead.full_name || "Unknown Business";
  const email = lead.email || "";

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return getUnavailableEnrichment(companyName, email);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are an enterprise B2B market intelligence assistant.
Analyze and enrich intelligence for company "${companyName}" (Email domain: "${email}").

Provide a JSON response strictly matching this JSON schema:
{
  "companyName": string,
  "industry": string (e.g. "Logistics & Supply Chain", "Biotech", "E-Commerce", "SaaS"),
  "estimatedEmployees": string (e.g. "50 - 200 employees"),
  "estimatedRevenue": string (e.g. "$5M - $10M ARR"),
  "techStack": array of 3 string technology names,
  "keyPainPoints": string concise sentence describing likely business needs
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
      companyName: parsed.companyName || companyName,
      industry: parsed.industry || "Technology & Business Services",
      estimatedEmployees: parsed.estimatedEmployees || "20 - 50 employees",
      estimatedRevenue: parsed.estimatedRevenue || "$1M - $5M ARR",
      techStack: parsed.techStack || ["React", "Node.js", "HubSpot"],
      keyPainPoints:
        parsed.keyPainPoints ||
        "Seeking automated sales workflows and AI-driven conversion optimization.",
      enrichmentSource: "gemini-flash",
    };
  } catch (err) {
    console.warn("[EnrichmentEngine] Gemini API call failed; enrichment is unavailable:", err);
    return getUnavailableEnrichment(companyName, email);
  }
}

function getUnavailableEnrichment(
  companyName: string,
  email: string
): EnrichedCompanyData {
  return {
    companyName,
    industry: "Unavailable",
    estimatedEmployees: "Unavailable",
    estimatedRevenue: "Unavailable",
    techStack: [],
    keyPainPoints: email
      ? "Gemini enrichment is unavailable; no market intelligence was inferred from the contact data."
      : "Gemini enrichment is unavailable; no market intelligence was inferred.",
    enrichmentSource: "unavailable",
  };
}
