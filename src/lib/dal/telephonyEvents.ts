import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataAccessError } from "@/lib/dal/errors";

type SessionRow = Database["public"]["Tables"]["telephony_call_sessions"]["Row"];
type EventRow = Database["public"]["Tables"]["telephony_call_events"]["Row"];
type EventProvider = EventRow["provider"];

const MAX_DIAGNOSTIC_ROWS = 50;

export interface TelephonyActiveCall {
  id: string;
  provider: SessionRow["provider"];
  direction: SessionRow["direction"];
  status: SessionRow["status"];
  leadId: string | null;
  operatorId: string | null;
  toNumber: string | null;
  startedAt: string | null;
  createdAt: string;
}

export interface TelephonyRecentEvent {
  id: string;
  sessionId: string | null;
  provider: EventProvider;
  eventType: string;
  occurredAt: string | null;
  createdAt: string;
}

function capLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit || 20, 1), MAX_DIAGNOSTIC_ROWS);
}

export async function listActiveTelephonySessions(workspaceId: string, limit?: number): Promise<TelephonyActiveCall[]> {
  const { data, error } = await createAdminClient()
    .from("telephony_call_sessions")
    .select("id, provider, direction, status, lead_id, operator_id, to_number, started_at, created_at")
    .eq("workspace_id", workspaceId)
    .in("status", ["initiated", "ringing", "connected", "held"])
    .order("created_at", { ascending: false })
    .limit(capLimit(limit));

  if (error) throw new DataAccessError("DATABASE", "Could not load active telephony calls.");
  return (data as SessionRow[]).map((row) => ({
    id: row.id,
    provider: row.provider,
    direction: row.direction,
    status: row.status,
    leadId: row.lead_id,
    operatorId: row.operator_id,
    toNumber: row.to_number,
    startedAt: row.started_at,
    createdAt: row.created_at,
  }));
}

export async function listRecentTelephonyEvents(workspaceId: string, limit?: number): Promise<TelephonyRecentEvent[]> {
  const { data, error } = await createAdminClient()
    .from("telephony_call_events")
    .select("id, call_session_id, provider, event_type, occurred_at, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(capLimit(limit));

  if (error) throw new DataAccessError("DATABASE", "Could not load recent telephony events.");
  return (data as EventRow[]).map((row) => ({
    id: row.id,
    sessionId: row.call_session_id,
    provider: row.provider,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }));
}

export async function recordTelephonyEvent(input: {
  workspaceId: string;
  sessionId?: string | null;
  provider: EventProvider;
  eventId: string;
  eventType: string;
  occurredAt?: string | null;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("telephony_call_events")
    .upsert({
      workspace_id: input.workspaceId,
      call_session_id: input.sessionId || null,
      provider: input.provider,
      provider_event_id: input.eventId,
      event_type: input.eventType,
      payload: {},
      occurred_at: input.occurredAt || null,
    }, { onConflict: "provider,provider_event_id", ignoreDuplicates: true });

  if (error) throw new DataAccessError("DATABASE", "Could not record the telephony event.");
}
