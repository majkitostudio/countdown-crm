import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { DataAccessError } from "@/lib/dal/errors";
import { canTransitionCallStatus, type TelephonyCallStatus } from "@/lib/telephony/telnyxLifecycle";
import { getAllowedPreviousStatuses, isSessionStatus } from "@/lib/telephony/sessionTransitions";

export type TelephonySessionProvider = "telnyx" | "local_sip";

export interface CreateTelephonySessionInput {
  workspaceId: string;
  operatorId: string;
  provider: TelephonySessionProvider;
  leadId?: string | null;
  queueItemId?: string | null;
  toNumber: string;
  direction: "inbound" | "outbound";
}

interface TransitionTelephonySessionInput {
  sessionId: string;
  workspaceId: string;
  operatorId: string;
  status: TelephonyCallStatus;
  providerCallId?: string | null;
  providerEventId?: string | null;
  occurredAt?: string | null;
}

export async function createTelephonySession(input: CreateTelephonySessionInput): Promise<{ sessionId: string; provider: TelephonySessionProvider }> {
  const { data, error } = await createAdminClient()
    .from("telephony_call_sessions")
    .insert({
      workspace_id: input.workspaceId,
      lead_id: input.leadId,
      queue_item_id: input.queueItemId || null,
      operator_id: input.operatorId,
      provider: input.provider,
      direction: input.direction,
      to_number: input.toNumber,
      status: "initiated",
    })
    .select("id, provider")
    .single();

  if (error || !data) throw new DataAccessError("DATABASE", "Could not create the telephony session.");
  return { sessionId: data.id, provider: data.provider as TelephonySessionProvider };
}

export async function transitionTelephonySession(input: TransitionTelephonySessionInput): Promise<{ status: TelephonyCallStatus }> {
  const admin = createAdminClient();
  const { data: existingSession, error: lookupError } = await admin
    .from("telephony_call_sessions")
    .select("id,status")
    .eq("id", input.sessionId)
    .eq("workspace_id", input.workspaceId)
    .eq("operator_id", input.operatorId)
    .maybeSingle();

  if (lookupError) throw new DataAccessError("DATABASE", "Could not read the telephony session.");
  if (!existingSession) throw new DataAccessError("NOT_FOUND", "Telephony session is not available.");
  if (!isSessionStatus(existingSession.status)) throw new DataAccessError("DATABASE", "Stored telephony session has an invalid status.");
  if (!canTransitionCallStatus(existingSession.status, input.status)) {
    throw new DataAccessError("VALIDATION", "The telephony session has already moved past this state.");
  }

  const eventTime = input.occurredAt || new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: input.status,
    provider_call_id: input.providerCallId?.trim() || undefined,
  };
  if (input.status === "connected" && existingSession.status !== "connected") updates.answered_at = eventTime;
  if ((input.status === "ended" || input.status === "failed") && existingSession.status !== input.status) updates.ended_at = eventTime;

  const { data, error } = await admin
    .from("telephony_call_sessions")
    .update(updates)
    .eq("id", input.sessionId)
    .eq("workspace_id", input.workspaceId)
    .eq("operator_id", input.operatorId)
    .in("status", getAllowedPreviousStatuses(input.status))
    .select("status")
    .maybeSingle();

  if (error) throw new DataAccessError("DATABASE", "Could not update the telephony session.");
  if (!data || !isSessionStatus(data.status)) throw new DataAccessError("VALIDATION", "The telephony session changed before this update.");
  return { status: data.status };
}
