import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceRole } from "./workspace";
import { createDataClient } from "./db";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = LeadRow["status"];

const LEAD_STATUSES: readonly LeadStatus[] = ["new", "contacted", "qualified", "customer", "unresponsive"];
const LEAD_FIELDS = "id, workspace_id, full_name, phone, email, city, company, country, status, ai_score, notes, created_at, updated_at";

export type LeadDTO = Pick<
  LeadRow,
  | "id"
  | "workspace_id"
  | "full_name"
  | "phone"
  | "email"
  | "city"
  | "company"
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
  company?: string | null;
  country?: string;
  status?: LeadStatus;
  ai_score?: number;
  notes?: string | null;
}

function assertLeadInput(input: CreateLeadInput): void {
  if (
    !input ||
    typeof input.full_name !== "string" ||
    typeof input.phone !== "string" ||
    !input.full_name.trim() ||
    !input.phone.trim()
  ) {
    throw new DataAccessError("VALIDATION", "Lead name and phone are required");
  }

  if (
    (input.email !== undefined && input.email !== null && typeof input.email !== "string") ||
    (input.city !== undefined && input.city !== null && typeof input.city !== "string") ||
    (input.company !== undefined && input.company !== null && typeof input.company !== "string") ||
    (input.country !== undefined && typeof input.country !== "string") ||
    (input.notes !== undefined && input.notes !== null && typeof input.notes !== "string")
  ) {
    throw new DataAccessError("VALIDATION", "Lead text fields must be strings");
  }

  if (
    input.full_name.length > 200 ||
    input.phone.length > 40 ||
    (input.email?.length || 0) > 320 ||
    (input.company?.length || 0) > 200 ||
    (input.notes?.length || 0) > 5000
  ) {
    throw new DataAccessError("VALIDATION", "Lead input is too long");
  }

  if (input.status !== undefined && !LEAD_STATUSES.includes(input.status)) {
    throw new DataAccessError("VALIDATION", "Invalid lead status");
  }

  if (
    input.ai_score !== undefined &&
    (!Number.isFinite(input.ai_score) || input.ai_score < 0 || input.ai_score > 100)
  ) {
    throw new DataAccessError("VALIDATION", "Lead score must be between 0 and 100");
  }
}

export async function listLeadsForWorkspace(options?: {
  workspaceId?: string;
  status?: LeadStatus;
  search?: string;
  sortBy?: "name" | "score" | "created";
}): Promise<LeadDTO[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"], options?.workspaceId);
  const supabase = await createDataClient();
  let query = supabase
    .from("leads")
    .select(LEAD_FIELDS)
    .eq("workspace_id", context.workspaceId)
    .order(
      options?.sortBy === "name"
        ? "full_name"
        : options?.sortBy === "score"
          ? "ai_score"
          : "created_at",
      { ascending: options?.sortBy === "name" ? true : false },
    );

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.search?.trim()) {
    const search = options.search.trim().replace(/[%(),]/g, " ");
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
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
  const context = await requireWorkspaceRole(["team_leader", "administrator"], workspaceId);
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      workspace_id: context.workspaceId,
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      city: input.city?.trim() || null,
      company: input.company?.trim() || null,
      country: input.country?.trim() || "CZ",
      status: input.status || "new",
      ai_score: input.ai_score ?? 50,
    notes: input.notes?.trim() || null,
  })
    .select(LEAD_FIELDS)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Lead creation failed");
  }

  return data as LeadDTO;
}

export async function createLeadsForWorkspace(
  inputs: CreateLeadInput[],
  workspaceId?: string,
): Promise<LeadDTO[]> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new DataAccessError("VALIDATION", "Lead import requires at least one row");
  }

  if (inputs.length > 1000) {
    throw new DataAccessError("VALIDATION", "Lead import is limited to 1000 rows per request");
  }

  inputs.forEach(assertLeadInput);
  const context = await requireWorkspaceRole(["team_leader", "administrator"], workspaceId);
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("leads")
    .insert(
      inputs.map((input) => ({
        workspace_id: context.workspaceId,
        full_name: input.full_name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        city: input.city?.trim() || null,
        company: input.company?.trim() || null,
        country: input.country?.trim() || "CZ",
        status: input.status || "new",
        ai_score: input.ai_score ?? 50,
        notes: input.notes?.trim() || null,
      })),
    )
    .select(LEAD_FIELDS);

  if (error || !data || data.length !== inputs.length) {
    throw new DataAccessError("DATABASE", "Lead import failed");
  }

  return data as LeadDTO[];
}

export async function updateLeadStatusForWorkspace(
  leadId: string,
  status: LeadStatus,
  workspaceId?: string
): Promise<LeadDTO> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"], workspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("update_lead_status_with_audit", {
    p_workspace_id: context.workspaceId,
    p_lead_id: leadId,
    p_status: status,
  } as never);

  const row = (Array.isArray(data) ? data[0] : data) as LeadDTO | null;
  if (error) {
    if (error.message?.includes("not found in the active workspace")) {
      throw new DataAccessError("NOT_FOUND", "Lead not found in workspace");
    }
    throw new DataAccessError("DATABASE", "Lead update failed");
  }

  if (!row) {
    throw new DataAccessError("NOT_FOUND", "Lead not found in workspace");
  }

  return row as LeadDTO;
}
