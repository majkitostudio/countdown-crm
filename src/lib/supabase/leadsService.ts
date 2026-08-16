import { createClient } from "./client";
import { Database } from "./types";
import { Lead, LeadStatus, calculateAiLeadScore } from "../leads";
import { getCurrentWorkspaceId } from "./workspace";
import { saveAuditLogToSupabase } from "./auditService";

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
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  let query = supabase.from("leads").select("*").eq("workspace_id", workspaceId);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options?.search) {
    const s = `%${options.search}%`;
    query = query.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s},city.ilike.${s},company.ilike.${s}`);
  }

  if (options?.sortBy === "name") {
    query = query.order("full_name", { ascending: true });
  } else if (options?.sortBy === "score") {
    query = query.order("ai_score", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Lead query failed");
  }

  if (!data) {
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
    ai_score: l.ai_score ?? 50,
    notes: l.notes || null,
    company: l.company || null,
    last_contacted_at: l.updated_at || l.created_at,
    created_at: l.created_at,
    updated_at: l.updated_at,
  }));
}

export async function createLeadInSupabase(lead: Partial<Lead>): Promise<Lead | null> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const score = lead.ai_score || calculateAiLeadScore(lead);
  const payload = {
    workspace_id: workspaceId,
    full_name: lead.full_name || "New Lead",
    phone: lead.phone || "",
    email: lead.email || null,
    city: lead.city?.trim() || null,
    company: lead.company?.trim() || null,
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
    throw new Error("Lead insert failed");
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
    last_contacted_at: typedData.created_at,
    created_at: typedData.created_at,
    updated_at: typedData.updated_at,
  };
}

export async function updateLeadStatusInSupabase(id: string, status: LeadStatus): Promise<boolean> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return false;

  const { error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[leadsService] Error updating lead status in Supabase:", error);
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const auditSaved = await saveAuditLogToSupabase({
    operatorId: user?.id || "unknown",
    operatorName: user?.email || "Authenticated operator",
    actionType: "LEAD_UPDATE",
    severity: "low",
    details: `Lead ${id} status changed to ${status}`,
    ipAddress: "127.0.0.1",
  });
  if (!auditSaved) {
    throw new Error("Lead status changed but audit event was not saved");
  }

  return true;
}

export async function deleteLeadFromSupabase(id: string): Promise<boolean> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return false;

  const { error } = await supabase.from("leads").delete().eq("id", id).eq("workspace_id", workspaceId);

  if (error) {
    console.error("[leadsService] Error deleting lead from Supabase:", error);
    return false;
  }

  return true;
}
