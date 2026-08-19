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

export async function listOperatorCalendarEntriesForWorkspace(
  from?: string,
  to?: string,
  requestedWorkspaceId?: string,
): Promise<CalendarEntryDTO[]> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const range = normalizeRange(from, to);

  const [callbacks, reminders] = await Promise.all([
    listScheduledCallbacksForWorkspace(range.from, range.to, context.workspaceId),
    listOperatorRemindersForWorkspace(range.from, range.to, context.workspaceId),
  ]);

  const callbackEntries: CalendarEntryDTO[] = callbacks.map((callback) => ({
    id: callback.id,
    type: "callback",
    title: `Callback: ${callback.lead.full_name}`,
    starts_at: callback.scheduled_at,
    remind_at: null,
    status: "scheduled",
    lead: callback.lead,
    reminder: null,
  }));

  const reminderEntries: CalendarEntryDTO[] = reminders.map((reminder) => ({
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

  return [...callbackEntries, ...reminderEntries].sort(
    (left, right) => Date.parse(left.starts_at) - Date.parse(right.starts_at),
  );
}
