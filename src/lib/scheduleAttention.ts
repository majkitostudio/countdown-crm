/**
 * Pomocné funkce pro sledování naplánovaných hovorů (Schedule / scheduled calls).
 * Vychází ze stavu fronty `scheduled` (databázový klíč) a času `scheduled_at`.
 */

export interface ScheduledCallQueueItem {
  state: string;
  scheduled_at: string | null;
}

export interface ScheduledCallAttentionSummary {
  total: number;
  scheduled: number;
  overdue: number;
}

function hasValidSchedule(item: ScheduledCallQueueItem): item is ScheduledCallQueueItem & { scheduled_at: string } {
  return item.state === "scheduled"
    && typeof item.scheduled_at === "string"
    && Number.isFinite(Date.parse(item.scheduled_at));
}

export function isOverdueScheduledCall(item: ScheduledCallQueueItem, now = new Date()): boolean {
  return hasValidSchedule(item) && Date.parse(item.scheduled_at) < now.getTime();
}

export function getScheduledCallAttention(
  queueItems: ScheduledCallQueueItem[],
  now = new Date(),
): ScheduledCallAttentionSummary {
  const scheduledCalls = queueItems.filter(hasValidSchedule);
  const overdue = scheduledCalls.filter((item) => isOverdueScheduledCall(item, now)).length;

  return {
    total: scheduledCalls.length,
    scheduled: scheduledCalls.length - overdue,
    overdue,
  };
}

