import "server-only";

import { DataAccessError } from "./errors";
import { listScheduledCallbacksForWorkspace } from "./leadQueue";
import { listOperatorRemindersForWorkspace, type OperatorReminderDTO } from "./operatorReminders";
import { requireWorkspaceContext } from "./workspace";

export type CalendarEntryType = "callback" | "reminder";

export interface CalendarEntryDTO {
  id: string;
  type: CalendarEntryType;
  title: string;
  starts_at: string;
  remind_at: string | null;
  status: "scheduled" | "open" | "completed";
  lead: { id: string; full_name: string; phone: string; email: string | null } | null;
  reminder: OperatorReminderDTO | null;
}

export type CalendarSourceState =
  | { state: "available" }
  | { state: "unavailable"; message: string };

export interface CalendarLoadResult {
  entries: CalendarEntryDTO[];
  sources: {
    callbacks: CalendarSourceState;
    reminders: CalendarSourceState;
  };
}

function normalizeRange(from?: string, to?: string): { from: string; to: string } {
  const start = from ? Date.parse(from) : Date.now() - 7 * 24 * 60 * 60 * 1000;
  const end = to ? Date.parse(to) : Date.now() + 14 * 24 * 60 * 60 * 1000;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new DataAccessError("VALIDATION", "Calendar date range is invalid.");
  }

  if (end - start > 45 * 24 * 60 * 60 * 1000) {
    throw new DataAccessError("VALIDATION", "Calendar date range cannot exceed 45 days.");
  }

  return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}

function mapCallbackEntries(callbacks: Awaited<ReturnType<typeof listScheduledCallbacksForWorkspace>>): CalendarEntryDTO[] {
  return callbacks.map((callback) => ({
    id: callback.id,
    type: "callback",
    title: `Callback: ${callback.lead.full_name}`,
    starts_at: callback.scheduled_at,
    remind_at: null,
    status: "scheduled",
    lead: callback.lead,
    reminder: null,
  }));
}

function mapReminderEntries(reminders: OperatorReminderDTO[]): CalendarEntryDTO[] {
  return reminders.map((reminder) => ({
    id: reminder.id,
    type: "reminder",
    title: reminder.title,
    starts_at: reminder.due_at,
    remind_at: reminder.remind_at,
    status: reminder.status === "completed" ? "completed" : "open",
    lead: reminder.lead
      ? { ...reminder.lead, email: null }
      : null,
    reminder,
  }));
}

function sortCalendarEntries(entries: CalendarEntryDTO[]): CalendarEntryDTO[] {
  return entries.sort((left, right) => Date.parse(left.starts_at) - Date.parse(right.starts_at));
}

function resolveSourceState(result: PromiseSettledResult<unknown>): CalendarSourceState {
  if (result.status === "fulfilled") {
    return { state: "available" };
  }

  if (result.reason instanceof DataAccessError) {
    if (result.reason.code !== "DATABASE") {
      throw result.reason;
    }

    return {
      state: "unavailable",
      message: result.reason.message,
    };
  }

  return {
    state: "unavailable",
    message: "Calendar source could not be loaded.",
  };
}

export function buildCalendarLoadResult(
  callbacksResult: PromiseSettledResult<Awaited<ReturnType<typeof listScheduledCallbacksForWorkspace>>>,
  remindersResult: PromiseSettledResult<OperatorReminderDTO[]>,
): CalendarLoadResult {
  const sources = {
    callbacks: resolveSourceState(callbacksResult),
    reminders: resolveSourceState(remindersResult),
  };

  const callbackEntries =
    callbacksResult.status === "fulfilled"
      ? mapCallbackEntries(callbacksResult.value)
      : [];
  const reminderEntries =
    remindersResult.status === "fulfilled"
      ? mapReminderEntries(remindersResult.value)
      : [];

  return {
    entries: sortCalendarEntries([...callbackEntries, ...reminderEntries]),
    sources,
  };
}

export async function listOperatorCalendarEntriesForWorkspace(
  from?: string,
  to?: string,
  requestedWorkspaceId?: string,
): Promise<CalendarLoadResult> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const range = normalizeRange(from, to);

  const [callbacks, reminders] = await Promise.allSettled([
    listScheduledCallbacksForWorkspace(range.from, range.to, context.workspaceId),
    listOperatorRemindersForWorkspace(range.from, range.to, context.workspaceId),
  ]);

  return buildCalendarLoadResult(callbacks, reminders);
}
