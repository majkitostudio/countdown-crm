/**
 * Gemini Automatic Company & Lead Data Enrichment Engine
 *
 * Enriches lead and company profiles using Google Gemini 2.5 Flash API
 * to derive industry, company size, key products, and intent signals.
 */

import { GoogleGenAI } from "@google/genai";
import { Lead } from "./leads";

export interface EnrichedCompanyData {
  companyName: string;
  industry: string;
  estimatedEmployees: string;
  estimatedRevenue: string;
  techStack: string[];
  keyPainPoints: string;
  enrichmentSource: "gemini-flash" | "fallback-enricher";
}

/**
 * Enriches company and lead profile using Gemini 2.5 Flash API
 */
export async function enrichLeadWithGemini(
  lead: Partial<Lead>
): Promise<EnrichedCompanyData> {
  const companyName = lead.company || lead.full_name || "Unknown Business";
  const email = lead.email || "";

  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.log("[EnrichmentEngine] Using intelligent fallback enrichment generator.");
    return generateFallbackEnrichment(companyName, email);
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
    console.warn("[EnrichmentEngine] Gemini API call failed, using fallback enricher:", err);
    return generateFallbackEnrichment(companyName, email);
  }
}

/**
 * Intelligent Fallback Enrichment Generator
 */
export function generateFallbackEnrichment(
  companyName: string,
  email: string
): EnrichedCompanyData {
  const lower = (companyName + " " + email).toLowerCase();

  if (lower.includes("apex") || lower.includes("logistics")) {
    return {
      companyName,
      industry: "Logistics & Transport CZ",
      estimatedEmployees: "150 - 300 zaměstnanců",
      estimatedRevenue: "120 mil. Kč ARR",
      techStack: ["SAP ERP", "Salesforce", "Custom WMS"],
      keyPainPoints: "Potřeba zrychlení vyřizování zákaznických požadavků a automatického volání.",
      enrichmentSource: "fallback-enricher",
    };
  }

  if (lower.includes("biotech") || lower.includes("medicare") || lower.includes("clinic")) {
    return {
      companyName,
      industry: "Healthcare & Life Sciences",
      estimatedEmployees: "45 - 90 zaměstnanců",
      estimatedRevenue: "60 mil. Kč ARR",
      techStack: ["Epic EHR", "HubSpot CRM", "Next.js"],
      keyPainPoints: "Automatizace připomínek schůzek a zvýšení retence pacientů/klientů.",
      enrichmentSource: "fallback-enricher",
    };
  }

  return {
    companyName,
    industry: "B2B Professional Services",
    estimatedEmployees: "25 - 50 zaměstnanců",
    estimatedRevenue: "35 mil. Kč ARR",
    techStack: ["Google Workspace", "PostgreSQL", "React"],
    keyPainPoints: "Implementace AI nástrojů pro zrychlení prodejního cyklu a automatické skórování leadů.",
    enrichmentSource: "fallback-enricher",
  };
}
