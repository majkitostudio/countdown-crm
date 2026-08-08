import { createClient } from "./client";
import { Database } from "./types";
import { Lead, LeadStatus, calculateAiLeadScore } from "../leads";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

/**
 * Supabase Data Access Service for Leads & Customer Directory
 */

export async function fetchLeadsFromSupabase(options?: {
  status?: string;
  search?: string;
  sortBy?: "name" | "score" | "created";
}): Promise<Lead[]> {
  const supabase = getDb();

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

  return (data as LeadRow[]).map((l) => ({
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
  const supabase = getDb();

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

  const typedData = data as LeadRow;

  return {
    id: typedData.id,
    full_name: typedData.full_name,
    phone: typedData.phone,
    email: typedData.email || null,
    city: typedData.city || null,
    country: typedData.country || "CZ",
    status: typedData.status as LeadStatus,
    ai_score: typedData.ai_score,
    notes: typedData.notes || null,
    company: typedData.company || null,
    value: typedData.value || 500,
    last_contacted_at: typedData.created_at,
    created_at: typedData.created_at,
    updated_at: typedData.updated_at,
  };
}

export async function updateLeadStatusInSupabase(id: string, status: LeadStatus): Promise<boolean> {
  const supabase = getDb();

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
  const supabase = getDb();

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    console.error("[leadsService] Error deleting lead from Supabase:", error);
    return false;
  }

  return true;
}
