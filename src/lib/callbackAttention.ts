export interface CallbackQueueItem {
  state: string;
  scheduled_at: string | null;
}

export interface CallbackAttentionSummary {
  total: number;
  scheduled: number;
  overdue: number;
}

function hasValidSchedule(item: CallbackQueueItem): item is CallbackQueueItem & { scheduled_at: string } {
  return item.state === "waiting_callback"
    && typeof item.scheduled_at === "string"
    && Number.isFinite(Date.parse(item.scheduled_at));
}

export function isOverdueCallback(item: CallbackQueueItem, now = new Date()): boolean {
  return hasValidSchedule(item) && Date.parse(item.scheduled_at) < now.getTime();
}

export function getCallbackAttention(
  queueItems: CallbackQueueItem[],
  now = new Date(),
): CallbackAttentionSummary {
  const callbacks = queueItems.filter(hasValidSchedule);
  const overdue = callbacks.filter((item) => isOverdueCallback(item, now)).length;

  return {
    total: callbacks.length,
    scheduled: callbacks.length - overdue,
    overdue,
  };
}
