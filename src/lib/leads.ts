import { createLeadsBatchAction, listLeadsAction, updateLeadStatusAction } from "@/app/actions/crm";

export type LeadStatus = "new" | "contacted" | "qualified" | "customer" | "unresponsive";

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  country: string;
  status: LeadStatus;
  ai_score: number;
  notes: string | null;
  company?: string | null;
  created_at: string;
  updated_at: string;
}

/** Calculate the deterministic lead score used before a lead is persisted. */
export function calculateAiLeadScore(lead: Partial<Lead>): number {
  let score = 40;

  if (lead.phone && lead.phone.trim().length >= 9) score += 20;

  if (lead.email) {
    const email = lead.email.toLowerCase();
    if (email.includes("@gmail.com") || email.includes("@yahoo.com") || email.includes("@seznam.cz")) {
      score += 10;
    } else if (email.includes("@")) {
      score += 20;
    }
  }

  if (lead.city) score += 10;

  if (lead.status === "customer") score += 20;
  else if (lead.status === "qualified") score += 15;
  else if (lead.status === "contacted") score += 5;
  else if (lead.status === "unresponsive") score -= 25;

  if (lead.notes && lead.notes.length > 20) score += 10;

  return Math.min(99, Math.max(5, score));
}

export async function getLeads(options?: {
  status?: string;
  search?: string;
  sortBy?: "name" | "score" | "created";
}): Promise<Lead[]> {
  const data = await listLeadsAction({
    status: isLeadStatus(options?.status) ? options.status : undefined,
    search: options?.search,
    sortBy: options?.sortBy,
  });

  return data.map(mapLeadDTO);
}

export async function addLeadsBatch(leads: Partial<Lead>[]): Promise<Lead[]> {
  if (leads.some((item) => !item.full_name?.trim() || !item.phone?.trim())) {
    throw new Error("Lead name and phone are required");
  }

  const payload = leads.map((item) => ({
    full_name: item.full_name!.trim(),
    phone: item.phone!.trim(),
    email: item.email || null,
    city: item.city?.trim() || null,
    company: item.company?.trim() || null,
    country: item.country || "CZ",
    status: item.status || "new",
    ai_score: item.ai_score ?? calculateAiLeadScore(item),
    notes: item.notes || null,
  }));

  const data = await createLeadsBatchAction(payload);
  return data.map(mapLeadDTO);
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  if (!updates.status) {
    throw new Error("Only lead status updates are supported by the Supabase lead service");
  }

  const saved = await updateLeadStatusAction(id, updates.status);
  return mapLeadDTO(saved);
}

type SavedLead = Awaited<ReturnType<typeof updateLeadStatusAction>>;

function isLeadStatus(value: string | undefined): value is LeadStatus {
  return value === "new" || value === "contacted" || value === "qualified" || value === "customer" || value === "unresponsive";
}

function mapLeadDTO(lead: SavedLead): Lead {
  return {
    id: lead.id,
    full_name: lead.full_name,
    phone: lead.phone,
    email: lead.email || null,
    city: lead.city || null,
    country: lead.country || "CZ",
    status: lead.status,
    ai_score: lead.ai_score,
    notes: lead.notes || null,
    company: lead.company || null,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
  };
}
