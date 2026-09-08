import type { WorkspaceActivity } from "@/lib/domain";
import {
  buildRecentContextFromSources,
  type RecentContextCallback,
  type RecentContextLoadResult,
  type RecentContextSourceState,
} from "./recentContext";

export interface RecentContextLoaders {
  loadActivities: () => Promise<WorkspaceActivity[]>;
  loadCalendar: () => Promise<RecentContextCalendarResult>;
}

export interface RecentContextCalendarResult {
  entries: Array<{
    id: string;
    type: string;
    title: string;
    starts_at: string;
    remind_at: string | null;
    status: "scheduled" | "open" | "completed";
    lead: { id: string; full_name: string; phone: string; email: string | null } | null;
    reminder: unknown;
  }>;
  sources: {
    callbacks: RecentContextCalendarSourceState;
    reminders: RecentContextCalendarSourceState;
  };
}

type RecentContextCalendarSourceState =
  | { state: "available" }
  | { state: "unavailable"; message: string };

function isDatabaseDataAccessError(error: unknown): error is { code: "DATABASE"; message: string } {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && error.code === "DATABASE"
      && "message" in error
      && typeof error.message === "string",
  );
}

function unavailableFromRejection(error: unknown): RecentContextSourceState<never> {
  if (isDatabaseDataAccessError(error)) {
    return { status: "unavailable", reason: "database", message: error.message };
  }

  throw error;
}

function callbacksFromCalendar(calendar: RecentContextCalendarResult): RecentContextSourceState<RecentContextCallback[]> {
  if (calendar.sources.callbacks.state === "unavailable") {
    return {
      status: "unavailable",
      reason: "provider",
      message: calendar.sources.callbacks.message,
    };
  }

  return {
    status: "ready",
    data: calendar.entries
      .filter((entry) => entry.type === "callback" && entry.lead)
      .map((entry) => ({
        id: entry.id,
        lead_id: entry.lead!.id,
        scheduled_at: entry.starts_at,
      })),
  };
}

export async function loadRecentContext(
  leadId: string,
  loaders: RecentContextLoaders,
  now?: number,
): Promise<RecentContextLoadResult> {
  const [activitiesResult, calendarResult] = await Promise.allSettled([
    loaders.loadActivities(),
    loaders.loadCalendar(),
  ]);

  const activities: RecentContextSourceState<WorkspaceActivity[]> = activitiesResult.status === "fulfilled"
    ? { status: "ready", data: activitiesResult.value }
    : unavailableFromRejection(activitiesResult.reason);
  const callbacks = calendarResult.status === "fulfilled"
    ? callbacksFromCalendar(calendarResult.value)
    : unavailableFromRejection(calendarResult.reason);

  return buildRecentContextFromSources({ leadId, activities, callbacks, now });
}
