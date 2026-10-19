import type { WorkspaceActivity } from "@/lib/domain";
import type { CalendarLoadResult, CalendarSourceState } from "@/lib/dal/calendar";

export interface RecentContextScheduledCall {
  id: string;
  lead_id: string;
  scheduled_at: string;
}

export interface RecentContextSignal {
  activity: WorkspaceActivity;
}

export interface RecentContextData {
  lastContact: RecentContextSignal | null;
  lastCallResult: RecentContextSignal | null;
  lastOrder: RecentContextSignal | null;
  activeScheduledCall: RecentContextScheduledCall | null;
}

export interface RecentContextFromCalendarResult {
  context: RecentContextData;
  scheduledCallSource: CalendarSourceState;
}

export type RecentContextSourceState<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; reason: "database" | "provider"; message: string };

export type RecentContextLoadState = "ready" | "partial" | "unavailable";

export interface RecentContextSourcesInput {
  leadId: string;
  activities: RecentContextSourceState<WorkspaceActivity[]>;
  scheduledCalls: RecentContextSourceState<RecentContextScheduledCall[]>;
  now?: number;
}

export interface RecentContextLoadResult {
  state: RecentContextLoadState;
  isEmpty: boolean;
  context: RecentContextData | null;
  unavailableSources: Array<"activities" | "scheduledCalls">;
  messages: Partial<Record<"activities" | "calendar", string>>;
}

function latestActivity(entries: WorkspaceActivity[], type: WorkspaceActivity["type"]): WorkspaceActivity | null {
  return entries
    .filter((entry) => entry.type === type)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))[0] || null;
}

function selectActiveScheduledCall(scheduledCalls: RecentContextScheduledCall[], now: number): RecentContextScheduledCall | null {
  const matchingScheduledCalls = scheduledCalls
    .filter((scheduledCall) => Number.isFinite(Date.parse(scheduledCall.scheduled_at)))
    .sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at));

  const upcoming = matchingScheduledCalls.find((scheduledCall) => Date.parse(scheduledCall.scheduled_at) >= now);
  return upcoming || matchingScheduledCalls[matchingScheduledCalls.length - 1] || null;
}

function hasAnySignal(context: RecentContextData): boolean {
  return Boolean(context.lastContact || context.lastCallResult || context.lastOrder || context.activeScheduledCall);
}

function collectMessages(input: RecentContextSourcesInput): Partial<Record<"activities" | "calendar", string>> {
  return {
    ...(input.activities.status === "unavailable" ? { activities: input.activities.message } : {}),
    ...(input.scheduledCalls.status === "unavailable" ? { calendar: input.scheduledCalls.message } : {}),
  };
}

export function buildRecentContextFromSources(input: RecentContextSourcesInput): RecentContextLoadResult {
  const unavailableSources = (["activities", "scheduledCalls"] as const)
    .filter((source) => input[source].status === "unavailable");
  const messages = collectMessages(input);

  if (unavailableSources.length === 2) {
    return {
      state: "unavailable",
      isEmpty: false,
      context: null,
      unavailableSources,
      messages,
    };
  }

  const context = buildRecentContext(
    input.leadId,
    input.activities.status === "ready" ? input.activities.data : [],
    input.scheduledCalls.status === "ready" ? input.scheduledCalls.data : [],
    input.now,
  );

  return {
    state: unavailableSources.length ? "partial" : "ready",
    isEmpty: unavailableSources.length === 0 && !hasAnySignal(context),
    context,
    unavailableSources,
    messages,
  };
}

export function buildRecentContext(
  leadId: string,
  activities: WorkspaceActivity[],
  scheduledCalls: RecentContextScheduledCall[],
  now = Date.now(),
): RecentContextData {
  const leadActivities = activities.filter((activity) => activity.record.id === leadId);
  const lastCall = latestActivity(leadActivities, "call");
  const lastOrder = latestActivity(leadActivities, "order");

  return {
    lastContact: lastCall ? { activity: lastCall } : null,
    lastCallResult: lastCall ? { activity: lastCall } : null,
    lastOrder: lastOrder ? { activity: lastOrder } : null,
    activeScheduledCall: selectActiveScheduledCall(scheduledCalls.filter((scheduledCall) => scheduledCall.lead_id === leadId), now),
  };
}

export function buildRecentContextFromCalendar(
  leadId: string,
  activities: WorkspaceActivity[],
  calendarResult: Pick<CalendarLoadResult, "entries" | "sources">,
  now = Date.now(),
): RecentContextFromCalendarResult {
  if (calendarResult.sources.scheduledCalls.state === "unavailable") {
    return {
      context: buildRecentContext(leadId, activities, [], now),
      scheduledCallSource: calendarResult.sources.scheduledCalls,
    };
  }

  return {
    context: buildRecentContext(
      leadId,
      activities,
      calendarResult.entries
        .filter((entry) => entry.type === "scheduled_call" && entry.lead)
        .map((entry) => ({
          id: entry.id,
          lead_id: entry.lead!.id,
          scheduled_at: entry.starts_at,
        })),
      now,
    ),
    scheduledCallSource: calendarResult.sources.scheduledCalls,
  };
}
