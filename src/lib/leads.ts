import { createClient } from "./supabase/client";
import { fetchLeadsFromSupabase, updateLeadStatusInSupabase } from "./supabase/leadsService";
import { getCurrentWorkspaceId } from "./supabase/workspace";

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
  value?: number;
  last_contacted_at?: string | null;
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
  return fetchLeadsFromSupabase(options);
}

export async function addLeadsBatch(leads: Partial<Lead>[]): Promise<Lead[]> {
  const supabase = createClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new Error("No active workspace");

  const payload = leads.map((item) => ({
    workspace_id: workspaceId,
    full_name: item.full_name || "New Lead",
    phone: item.phone || "",
    email: item.email || null,
    city: item.city?.trim() || null,
    country: item.country || "CZ",
    status: item.status || "new",
    ai_score: item.ai_score ?? calculateAiLeadScore(item),
    notes: item.notes || null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("leads") as any).insert(payload).select();
  if (error || !data) throw new Error("Lead batch insert failed");

  return (data as Lead[]).map((lead) => ({
    ...lead,
    email: lead.email || null,
    city: lead.city || null,
    country: lead.country || "CZ",
    notes: lead.notes || null,
    company: lead.company || null,
    value: lead.value,
    last_contacted_at: lead.updated_at || lead.created_at,
  }));
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  if (!updates.status) {
    throw new Error("Only lead status updates are supported by the Supabase lead service");
  }

  const saved = await updateLeadStatusInSupabase(id, updates.status);
  if (!saved) throw new Error("Lead status was not saved to Supabase");

  const leads = await fetchLeadsFromSupabase();
  return leads.find((lead) => lead.id === id) || null;
}
