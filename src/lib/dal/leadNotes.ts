import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceContext } from "./workspace";
import { getScopedLeadForWorkspace } from "./leadQueue";

type LeadNoteRow = Database["public"]["Tables"]["lead_notes"]["Row"];

export type LeadNoteDTO = Pick<
  LeadNoteRow,
  "id" | "workspace_id" | "lead_id" | "author_id" | "body" | "created_at"
> & {
  author_name: string;
};

const NOTE_FIELDS = "id, workspace_id, lead_id, author_id, body, created_at";

function validateBody(body: string): string {
  if (typeof body !== "string") {
    throw new DataAccessError("VALIDATION", "Vyplňte text poznámky.");
  }

  const normalized = body.trim();
  if (!normalized || normalized.length > 2000) {
    throw new DataAccessError("VALIDATION", "Text poznámky musí mít 1 až 2 000 znaků.");
  }

  return normalized;
}

async function loadAuthorNames(
  authorIds: string[],
): Promise<Map<string, string>> {
  if (authorIds.length === 0) return new Map();

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", authorIds);

  if (error) {
    throw new DataAccessError("DATABASE", "Autora poznámky leadu se nepodařilo načíst.");
  }

  return new Map((data || []).map((profile) => [profile.id, profile.full_name?.trim() || "Neznámý operátor"]));
}

function mapNote(row: LeadNoteRow, authorNames: Map<string, string>): LeadNoteDTO {
  return {
    ...row,
    author_name: authorNames.get(row.author_id) || "Neznámý operátor",
  };
}

export async function listLeadNotesForWorkspace(
  leadId: string,
  requestedWorkspaceId?: string,
): Promise<LeadNoteDTO[]> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("lead_notes")
    .select(NOTE_FIELDS)
    .eq("workspace_id", context.workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new DataAccessError("DATABASE", "Poznámky leadu se nepodařilo načíst. Zkuste to znovu.");
  }

  const rows = (data || []) as LeadNoteRow[];
  const authorNames = await loadAuthorNames(Array.from(new Set(rows.map((row) => row.author_id))));
  return rows.map((row) => mapNote(row, authorNames));
}

export async function createLeadNoteForWorkspace(
  leadId: string,
  body: string,
  requestedWorkspaceId?: string,
): Promise<LeadNoteDTO> {
  const normalizedBody = validateBody(body);
  const context = await requireWorkspaceContext(requestedWorkspaceId);

  const isOperator = context.role === "operator";
  if (isOperator) {
    try {
      await getScopedLeadForWorkspace(leadId, context.workspaceId);
    } catch (error) {
      if (error instanceof DataAccessError && error.code === "DATABASE") throw error;
      throw new DataAccessError("FORBIDDEN", "Kontakt není dostupný v aktuálním přiřazení.");
    }
  }

  const supabase = await createDataClient();

  if (!isOperator) {
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();

    if (leadError) {
      throw new DataAccessError("DATABASE", "Lead pro poznámku se nepodařilo načíst.");
    }
    if (!lead) {
      throw new DataAccessError("NOT_FOUND", "Lead nebyl v pracovním prostoru nalezen.");
    }
  }

  const { data, error } = await supabase
    .from("lead_notes")
    .insert({
      workspace_id: context.workspaceId,
      lead_id: leadId,
      author_id: context.userId,
      body: normalizedBody,
    })
    .select(NOTE_FIELDS)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Poznámku leadu se nepodařilo uložit. Zkuste to znovu.");
  }

  const authorNames = await loadAuthorNames([context.userId]);
  return mapNote(data as LeadNoteRow, authorNames);
}
