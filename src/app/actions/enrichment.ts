"use server";

import { requireAuthenticatedUser } from "@/lib/auth/server";
import { enrichLeadWithGemini } from "@/lib/enrichment";
import type { Lead } from "@/lib/leads";
import type { EnrichedCompanyData } from "@/lib/ai/types";

export async function enrichLeadAction(
  lead: Partial<Lead>
): Promise<EnrichedCompanyData> {
  await requireAuthenticatedUser();

  if (!lead || typeof lead !== "object") {
    throw new Error("Invalid enrichment request");
  }

  const company = lead.company?.trim();
  const fullName = lead.full_name?.trim();
  const email = lead.email?.trim();

  if (
    (company !== undefined && company.length > 200) ||
    (fullName !== undefined && fullName.length > 200) ||
    (email !== undefined && email.length > 320)
  ) {
    throw new Error("Enrichment request is too long");
  }

  return enrichLeadWithGemini({ ...lead, company, full_name: fullName, email });
}
