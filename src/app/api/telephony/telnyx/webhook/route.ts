import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeTelnyxClientState, verifyTelnyxWebhookSignature } from "@/lib/telephony/telnyxServer";
import { canTransitionCallStatus } from "@/lib/telephony/telnyxLifecycle";
import { getAllowedPreviousStatuses, isSessionStatus } from "@/lib/telephony/sessionTransitions";
import {
  isDuplicateProviderEvent,
  parseTelnyxVoiceEvent,
  statusForTelnyxEvent,
} from "@/lib/telephony/telnyxWebhook";

export const runtime = "nodejs";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function durationSeconds(payload: Record<string, unknown>): number | null {
  const startTime = stringValue(payload.start_time);
  const endTime = stringValue(payload.end_time);
  if (!startTime || !endTime) return null;
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.max(0, Math.round((end - start) / 1000));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const isValid = verifyTelnyxWebhookSignature({
    rawBody,
    signature: request.headers.get("telnyx-signature-ed25519"),
    timestamp: request.headers.get("telnyx-timestamp"),
    publicKey: process.env.TELNYX_PUBLIC_KEY,
  });
  if (!isValid) return NextResponse.json({ error: "Invalid Telnyx webhook signature." }, { status: 401 });

  try {
    const event = parseTelnyxVoiceEvent(rawBody);
    if (!event) return NextResponse.json({ ok: true });
    const { eventId, eventType, occurredAt, payload } = event;

    const state = decodeTelnyxClientState(payload.client_state);
    const admin = createAdminClient();
    let query = admin.from("telephony_call_sessions").select("id,workspace_id,status").limit(1);
    if (typeof state.sessionId === "string") query = query.eq("id", state.sessionId);
    else if (typeof payload.call_control_id === "string") query = query.eq("telnyx_call_control_id", payload.call_control_id);
    else return NextResponse.json({ ok: true });
    const { data: session } = await query.maybeSingle();
    if (!session) return NextResponse.json({ ok: true });

    const { error: eventError } = await admin.from("telephony_call_events").insert({
      workspace_id: session.workspace_id,
      call_session_id: session.id,
      provider: "telnyx",
      provider_event_id: eventId,
      event_type: eventType,
      provider_call_control_id: typeof payload.call_control_id === "string" ? payload.call_control_id : null,
      provider_call_leg_id: typeof payload.call_leg_id === "string" ? payload.call_leg_id : null,
      provider_call_session_id: typeof payload.call_session_id === "string" ? payload.call_session_id : null,
      payload,
      occurred_at: occurredAt,
    });
    // Telnyx retries events. A duplicate event is already safely recorded.
    if (eventError && !isDuplicateProviderEvent(eventError)) {
      throw eventError;
    }
    if (eventError && isDuplicateProviderEvent(eventError)) return NextResponse.json({ ok: true });

    const status = statusForTelnyxEvent(eventType);
    const sessionUpdates: Record<string, unknown> = {};
    const callControlId = stringValue(payload.call_control_id);
    const callLegId = stringValue(payload.call_leg_id);
    const callSessionId = stringValue(payload.call_session_id);
    const fromNumber = stringValue(payload.from);
    const toNumber = stringValue(payload.to);
    const hangupCause = stringValue(payload.hangup_cause);
    if (callControlId) sessionUpdates.telnyx_call_control_id = callControlId;
    if (callLegId) sessionUpdates.telnyx_call_leg_id = callLegId;
    if (callSessionId) sessionUpdates.telnyx_call_session_id = callSessionId;
    if (fromNumber) sessionUpdates.from_number = fromNumber;
    if (toNumber) sessionUpdates.to_number = toNumber;
    if (hangupCause) sessionUpdates.hangup_cause = hangupCause;

    if (status && isSessionStatus(session.status) && session.status !== status && canTransitionCallStatus(session.status, status)) {
      sessionUpdates.status = status;
      const eventTime = occurredAt || new Date().toISOString();
      if (eventType === "call.initiated") sessionUpdates.started_at = eventTime;
      if (eventType === "call.answered") sessionUpdates.answered_at = eventTime;
      if (eventType === "call.hangup") {
        sessionUpdates.ended_at = eventTime;
        const duration = durationSeconds(payload);
        if (duration !== null) sessionUpdates.duration_seconds = duration;
      }
    }

    if (Object.keys(sessionUpdates).length > 0) {
      let update = admin.from("telephony_call_sessions")
        .update(sessionUpdates)
        .eq("id", session.id)
        .eq("workspace_id", session.workspace_id);
      if (status && isSessionStatus(session.status) && session.status !== status) {
        update = update.in("status", getAllowedPreviousStatuses(status));
      }
      const { error: updateError } = await update;
      if (updateError) throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telnyx webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
