import type { WorkspaceActivity } from "@/lib/domain";
import type { CalendarLoadResult, CalendarSourceState } from "@/lib/dal/calendar";

export interface RecentContextCallback {
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
  activeCallback: RecentContextCallback | null;
}

export interface RecentContextFromCalendarResult {
  context: RecentContextData;
  callbackSource: CalendarSourceState;
}

function latestActivity(entries: WorkspaceActivity[], type: WorkspaceActivity["type"]): WorkspaceActivity | null {
  return entries
    .filter((entry) => entry.type === type)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))[0] || null;
}

function selectActiveCallback(callbacks: RecentContextCallback[], now: number): RecentContextCallback | null {
  const matchingCallbacks = callbacks
    .filter((callback) => Number.isFinite(Date.parse(callback.scheduled_at)))
    .sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at));

  const upcoming = matchingCallbacks.find((callback) => Date.parse(callback.scheduled_at) >= now);
  return upcoming || matchingCallbacks[matchingCallbacks.length - 1] || null;
}

export function buildRecentContext(
  leadId: string,
  activities: WorkspaceActivity[],
  callbacks: RecentContextCallback[],
  now = Date.now(),
): RecentContextData {
  const leadActivities = activities.filter((activity) => activity.record.id === leadId);
  const lastCall = latestActivity(leadActivities, "call");
  const lastOrder = latestActivity(leadActivities, "order");

  return {
    lastContact: lastCall ? { activity: lastCall } : null,
    lastCallResult: lastCall ? { activity: lastCall } : null,
    lastOrder: lastOrder ? { activity: lastOrder } : null,
    activeCallback: selectActiveCallback(callbacks.filter((callback) => callback.lead_id === leadId), now),
  };
}

export function buildRecentContextFromCalendar(
  leadId: string,
  activities: WorkspaceActivity[],
  calendarResult: Pick<CalendarLoadResult, "entries" | "sources">,
  now = Date.now(),
): RecentContextFromCalendarResult {
  if (calendarResult.sources.callbacks.state === "unavailable") {
    return {
      context: buildRecentContext(leadId, activities, [], now),
      callbackSource: calendarResult.sources.callbacks,
    };
  }

  return {
    context: buildRecentContext(
      leadId,
      activities,
      calendarResult.entries
        .filter((entry) => entry.type === "callback" && entry.lead)
        .map((entry) => ({
          id: entry.id,
          lead_id: entry.lead!.id,
          scheduled_at: entry.starts_at,
        })),
      now,
    ),
    callbackSource: calendarResult.sources.callbacks,
  };
}
