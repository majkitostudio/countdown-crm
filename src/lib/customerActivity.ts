export type CustomerActivitySource = "call" | "order" | "lead_note";
export type CustomerActivityChannel = "voice" | "commerce" | "internal_note";

export interface CustomerActivityEvent {
  id: string;
  source_entity_id: string;
  workspace_id: string;
  lead_id: string;
  occurred_at: string;
  source: CustomerActivitySource;
  channel: CustomerActivityChannel;
  actor: {
    id: string | null;
    display_name: string;
  };
  preview: {
    title: string;
    text: string | null;
  };
  metadata: {
    duration_seconds?: number;
    call_outcome?: string;
    sentiment?: string;
    amount?: number;
    currency?: string;
    order_source?: string;
  };
}

export interface CustomerActivityPage {
  items: CustomerActivityEvent[];
  next_cursor: string | null;
  has_more: boolean;
}

interface ActivityCursor {
  occurred_at: string;
  id: string;
}

export interface CustomerActivityPageOptions {
  cursor?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function timestampValue(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function compareCustomerActivityEvents(
  left: CustomerActivityEvent,
  right: CustomerActivityEvent,
): number {
  const timestampDifference = timestampValue(right.occurred_at) - timestampValue(left.occurred_at);
  if (timestampDifference !== 0) return timestampDifference;
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}

function encodeCursor(cursor: ActivityCursor): string {
  return btoa(JSON.stringify(cursor)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function decodeCursor(value: string): ActivityCursor {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const decoded = JSON.parse(atob(padded)) as Partial<ActivityCursor>;

  if (
    typeof decoded.occurred_at !== "string" ||
    typeof decoded.id !== "string" ||
    !decoded.occurred_at ||
    !decoded.id
  ) {
    throw new Error("Invalid activity cursor");
  }

  return { occurred_at: decoded.occurred_at, id: decoded.id };
}

function isAfterCursor(event: CustomerActivityEvent, cursor: ActivityCursor): boolean {
  const eventTime = timestampValue(event.occurred_at);
  const cursorTime = timestampValue(cursor.occurred_at);
  if (eventTime !== cursorTime) return eventTime < cursorTime;
  return event.id < cursor.id;
}

function deduplicateEvents(events: CustomerActivityEvent[]): CustomerActivityEvent[] {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort(compareCustomerActivityEvents);
}

export function pageCustomerActivityEvents(
  events: CustomerActivityEvent[],
  options: CustomerActivityPageOptions = {},
): CustomerActivityPage {
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(options.limit ?? DEFAULT_LIMIT)),
  );
  const normalizedEvents = deduplicateEvents(events);
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;
  const startIndex = cursor
    ? normalizedEvents.findIndex((event) => isAfterCursor(event, cursor))
    : 0;
  const start = startIndex < 0 ? normalizedEvents.length : startIndex;
  const items = normalizedEvents.slice(start, start + limit);
  const hasMore = start + items.length < normalizedEvents.length;

  return {
    items,
    has_more: hasMore,
    next_cursor: hasMore && items.length > 0
      ? encodeCursor({
          occurred_at: items[items.length - 1].occurred_at,
          id: items[items.length - 1].id,
        })
      : null,
  };
}
