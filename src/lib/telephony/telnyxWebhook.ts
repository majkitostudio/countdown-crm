import { mapTelnyxEventType, type TelephonyCallStatus } from "./telnyxLifecycle";

export interface ParsedTelnyxVoiceEvent {
  eventId: string;
  eventType: string;
  occurredAt: string | null;
  payload: Record<string, unknown>;
}

export function statusForTelnyxEvent(eventType: string): TelephonyCallStatus | null {
  return mapTelnyxEventType(eventType);
}

export function isDuplicateProviderEvent(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "23505";
}

export function parseTelnyxVoiceEvent(rawBody: string): ParsedTelnyxVoiceEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return null;
  const data = parsed.data;
  if (!data || typeof data !== "object") return null;
  const eventId = "id" in data && typeof data.id === "string" ? data.id : null;
  const eventType = "event_type" in data && typeof data.event_type === "string" ? data.event_type : null;
  const occurredAt = "occurred_at" in data && typeof data.occurred_at === "string" ? data.occurred_at : null;
  const payload = "payload" in data && data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
    ? data.payload as Record<string, unknown>
    : null;

  if (!eventId || !eventType || !payload) return null;
  return { eventId, eventType, occurredAt, payload };
}
