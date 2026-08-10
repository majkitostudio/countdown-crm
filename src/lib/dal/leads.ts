import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { createDataClient } from "./db";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = LeadRow["status"];

export type LeadDTO = Pick<
  LeadRow,
  | "id"
  | "workspace_id"
  | "full_name"
  | "phone"
  | "email"
  | "city"
  | "country"
  | "status"
  | "ai_score"
  | "notes"
  | "created_at"
  | "updated_at"
>;

export interface CreateLeadInput {
  full_name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  country?: string;
  status?: LeadStatus;
  ai_score?: number;
  notes?: string | null;
}

function assertLeadInput(input: CreateLeadInput): void {
  if (!input.full_name.trim() || !input.phone.trim()) {
    throw new DataAccessError("VALIDATION", "Lead name and phone are required");
  }

  if (input.full_name.length > 200 || input.phone.length > 40 || (input.email?.length || 0) > 320) {
    throw new DataAccessError("VALIDATION", "Lead input is too long");
  }

  if (input.ai_score !== undefined && (input.ai_score < 0 || input.ai_score > 100)) {
    throw new DataAccessError("VALIDATION", "Lead score must be between 0 and 100");
  }
}

export async function listLeadsForWorkspace(options?: {
  workspaceId?: string;
  status?: LeadStatus;
  search?: string;
}): Promise<LeadDTO[]> {
  const context = await requireWorkspaceContext(options?.workspaceId);
  const supabase = await createDataClient();
  let query = supabase
    .from("leads")
    .select("id, workspace_id, full_name, phone, email, city, country, status, ai_score, notes, created_at, updated_at")
    .eq("workspace_id", context.workspaceId)
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.search?.trim()) {
    const search = options.search.trim().replace(/[%(),]/g, " ");
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new DataAccessError("DATABASE", "Lead lookup failed");
  }

  return (data || []) as LeadDTO[];
}

export async function createLeadForWorkspace(
  input: CreateLeadInput,
  workspaceId?: string
): Promise<LeadDTO> {
  assertLeadInput(input);
  const context = await requireWorkspaceContext(workspaceId);
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      workspace_id: context.workspaceId,
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || "CZ",
      status: input.status || "new",
      ai_score: input.ai_score ?? 50,
      notes: input.notes?.trim() || null,
    })
    .select("id, workspace_id, full_name, phone, email, city, country, status, ai_score, notes, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Lead creation failed");
  }

  return data as LeadDTO;
}

export async function updateLeadStatusForWorkspace(
  leadId: string,
  status: LeadStatus,
  workspaceId?: string
): Promise<LeadDTO> {
  const context = await requireWorkspaceContext(workspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("workspace_id", context.workspaceId)
    .select("id, workspace_id, full_name, phone, email, city, country, status, ai_score, notes, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Lead update failed");
  }

  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Lead not found in workspace");
  }

  return data as LeadDTO;
}
