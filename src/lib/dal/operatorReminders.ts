import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceContext } from "./workspace";

type ReminderRow = Database["public"]["Tables"]["operator_reminders"]["Row"];
export type ReminderStatus = ReminderRow["status"];

export interface OperatorReminderDTO extends Pick<
  ReminderRow,
  "id" | "workspace_id" | "owner_id" | "lead_id" | "title" | "note" | "due_at" | "remind_at" | "status" | "completed_at" | "created_at" | "updated_at"
> {
  lead: { id: string; full_name: string; phone: string } | null;
}

export interface CreateOperatorReminderInput {
  title: string;
  note?: string | null;
  due_at: string;
  remind_at: string;
  lead_id?: string | null;
}

export interface UpdateOperatorReminderInput {
  title?: string;
  note?: string | null;
  due_at?: string;
  remind_at?: string;
  lead_id?: string | null;
}

const REMINDER_FIELDS = `
  id, workspace_id, owner_id, lead_id, title, note, due_at, remind_at,
  status, completed_at, created_at, updated_at,
  lead:leads(id, full_name, phone)
`;

function normalizeTitle(title: string): string {
  if (typeof title !== "string") {
    throw new DataAccessError("VALIDATION", "Zadejte název připomínky.");
  }

  const normalized = title.trim();
  if (!normalized || normalized.length > 200) {
    throw new DataAccessError("VALIDATION", "Název připomínky musí mít 1 až 200 znaků.");
  }

  return normalized;
}

function normalizeNote(note: string | null | undefined): string | null {
  if (note === null || note === undefined) return null;
  if (typeof note !== "string" || note.trim().length > 2000) {
    throw new DataAccessError("VALIDATION", "Poznámka k připomínce může mít nejvýše 2 000 znaků.");
  }
  return note.trim() || null;
}

function normalizeDate(value: string, label: string): string {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
    throw new DataAccessError("VALIDATION", `${label} musí být platné datum a čas.`);
  }
  return new Date(value).toISOString();
}

function validateSchedule(dueAt: string, remindAt: string): { due_at: string; remind_at: string } {
  const due_at = normalizeDate(dueAt, "Termín");
  const remind_at = normalizeDate(remindAt, "Čas upozornění");
  if (Date.parse(remind_at) > Date.parse(due_at)) {
    throw new DataAccessError("VALIDATION", "Čas upozornění nesmí být po termínu připomínky.");
  }
  return { due_at, remind_at };
}

async function assertLeadInWorkspace(
  supabase: Awaited<ReturnType<typeof createDataClient>>,
  leadId: string | null | undefined,
  workspaceId: string,
): Promise<void> {
  if (!leadId) return;

  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new DataAccessError("DATABASE", "Lead připomínky se nepodařilo vyhledat.");
  if (!data) throw new DataAccessError("NOT_FOUND", "Lead připomínky nebyl v tomto pracovním prostoru nalezen.");
}

function mapReminder(row: unknown): OperatorReminderDTO {
  return row as OperatorReminderDTO;
}

export async function listOperatorRemindersForWorkspace(
  from: string,
  to: string,
  requestedWorkspaceId?: string,
): Promise<OperatorReminderDTO[]> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const range = validateSchedule(to, from);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("operator_reminders")
    .select(REMINDER_FIELDS)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .neq("status", "cancelled")
    .gte("due_at", range.remind_at)
    .lte("due_at", range.due_at)
    .order("due_at", { ascending: true });

  if (error) throw new DataAccessError("DATABASE", "Připomínky operátora se nepodařilo načíst.");
  return ((data || []) as unknown[]).map(mapReminder);
}

export async function createOperatorReminderForWorkspace(
  input: CreateOperatorReminderInput,
  requestedWorkspaceId?: string,
): Promise<OperatorReminderDTO> {
  const title = normalizeTitle(input.title);
  const note = normalizeNote(input.note);
  const schedule = validateSchedule(input.due_at, input.remind_at);
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const supabase = await createDataClient();
  await assertLeadInWorkspace(supabase, input.lead_id, context.workspaceId);

  const { data, error } = await supabase
    .from("operator_reminders")
    .insert({
      workspace_id: context.workspaceId,
      owner_id: context.userId,
      lead_id: input.lead_id || null,
      title,
      note,
      due_at: schedule.due_at,
      remind_at: schedule.remind_at,
      status: "open",
    })
    .select(REMINDER_FIELDS)
    .single();

  if (error || !data) throw new DataAccessError("DATABASE", "Připomínku se nepodařilo uložit.");
  return mapReminder(data);
}

export async function updateOperatorReminderForWorkspace(
  reminderId: string,
  input: UpdateOperatorReminderInput,
  requestedWorkspaceId?: string,
): Promise<OperatorReminderDTO> {
  if (!reminderId.trim()) throw new DataAccessError("VALIDATION", "Je nutné zadat ID připomínky.");

  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data: existing, error: existingError } = await supabase
    .from("operator_reminders")
    .select("id, title, note, due_at, remind_at, lead_id, status")
    .eq("id", reminderId)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .eq("status", "open")
    .maybeSingle();

  if (existingError) throw new DataAccessError("DATABASE", "Připomínku se nepodařilo vyhledat.");
  if (!existing) throw new DataAccessError("NOT_FOUND", "Připomínka tohoto operátora nebyla nalezena.");

  const due_at = input.due_at === undefined ? existing.due_at : normalizeDate(input.due_at, "Termín");
  const remind_at = input.remind_at === undefined ? existing.remind_at : normalizeDate(input.remind_at, "Čas upozornění");
  validateSchedule(due_at, remind_at);
  const lead_id = input.lead_id === undefined ? existing.lead_id : input.lead_id || null;
  await assertLeadInWorkspace(supabase, lead_id, context.workspaceId);

  const { data, error } = await supabase
    .from("operator_reminders")
    .update({
      ...(input.title === undefined ? {} : { title: normalizeTitle(input.title) }),
      ...(input.note === undefined ? {} : { note: normalizeNote(input.note) }),
      due_at,
      remind_at,
      lead_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminderId)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .eq("status", "open")
    .select(REMINDER_FIELDS)
    .single();

  if (error || !data) throw new DataAccessError("DATABASE", "Připomínku se nepodařilo aktualizovat.");
  return mapReminder(data);
}

async function setReminderStatus(
  reminderId: string,
  status: Extract<ReminderStatus, "completed" | "cancelled">,
  requestedWorkspaceId?: string,
): Promise<OperatorReminderDTO> {
  if (!reminderId.trim()) throw new DataAccessError("VALIDATION", "Je nutné zadat ID připomínky.");

  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("operator_reminders")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminderId)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .eq("status", "open")
    .select(REMINDER_FIELDS)
    .single();

  if (error || !data) throw new DataAccessError("NOT_FOUND", "Připomínku se nepodařilo aktualizovat.");
  return mapReminder(data);
}

export function completeOperatorReminderForWorkspace(
  reminderId: string,
  requestedWorkspaceId?: string,
): Promise<OperatorReminderDTO> {
  return setReminderStatus(reminderId, "completed", requestedWorkspaceId);
}

export function cancelOperatorReminderForWorkspace(
  reminderId: string,
  requestedWorkspaceId?: string,
): Promise<OperatorReminderDTO> {
  return setReminderStatus(reminderId, "cancelled", requestedWorkspaceId);
}
