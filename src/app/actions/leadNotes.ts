"use server";

import {
  createLeadNoteForWorkspace,
  listLeadNotesForWorkspace,
} from "@/lib/dal/leadNotes";
import type { LeadNoteDTO } from "@/lib/dal/leadNotes";

export async function listLeadNotesAction(
  leadId: string,
  workspaceId?: string,
): Promise<LeadNoteDTO[]> {
  return listLeadNotesForWorkspace(leadId, workspaceId);
}

export async function createLeadNoteAction(
  leadId: string,
  body: string,
  workspaceId?: string,
): Promise<LeadNoteDTO> {
  return createLeadNoteForWorkspace(leadId, body, workspaceId);
}
