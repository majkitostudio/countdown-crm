import { createClient } from "./client";
import { Lead, LeadStatus, calculateAiLeadScore } from "../leads";

/**
 * Supabase Data Access Service for Leads & Customer Directory
 */

export async function fetchLeadsFromSupabase(options?: {
  status?: string;
  search?: string;
  sortBy?: "name" | "score" | "created";
}): Promise<Lead[]> {
  const supabase = createClient() as any;

  let query = supabase.from("leads").select("*");

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options?.search) {
    const s = `%${options.search}%`;
    query = query.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s},city.ilike.${s}`);
  }

  if (options?.sortBy === "name") {
    query = query.order("full_name", { ascending: true });
  } else if (options?.sortBy === "score") {
    query = query.order("ai_score", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return [];
  }

  return (data as any[]).map((l) => ({
    id: l.id,
    full_name: l.full_name,
    phone: l.phone,
    email: l.email || null,
    city: l.city || null,
    country: l.country || "CZ",
    status: l.status as LeadStatus,
    ai_score: l.ai_score || 50,
    notes: l.notes || null,
    company: l.company || null,
    value: l.value || 500,
    last_contacted_at: l.updated_at || l.created_at,
    created_at: l.created_at,
    updated_at: l.updated_at,
  }));
}

export async function createLeadInSupabase(lead: Partial<Lead>): Promise<Lead | null> {
  const supabase = createClient() as any;

  const score = lead.ai_score || calculateAiLeadScore(lead);
  const payload = {
    full_name: lead.full_name || "New Lead",
    phone: lead.phone || "",
    email: lead.email || null,
    city: lead.city || "Prague",
    country: lead.country || "CZ",
    status: lead.status || "new",
    ai_score: score,
    notes: lead.notes || null,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    console.error("[leadsService] Error creating lead in Supabase:", error);
    return null;
  }

  return {
    id: data.id,
    full_name: data.full_name,
    phone: data.phone,
    email: data.email || null,
    city: data.city || null,
    country: data.country || "CZ",
    status: data.status as LeadStatus,
    ai_score: data.ai_score,
    notes: data.notes || null,
    company: data.company || null,
    value: data.value || 500,
    last_contacted_at: data.created_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function updateLeadStatusInSupabase(id: string, status: LeadStatus): Promise<boolean> {
  const supabase = createClient() as any;

  const { error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[leadsService] Error updating lead status in Supabase:", error);
    return false;
  }

  return true;
}

export async function deleteLeadFromSupabase(id: string): Promise<boolean> {
  const supabase = createClient() as any;

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    console.error("[leadsService] Error deleting lead from Supabase:", error);
    return false;
  }

  return true;
}
