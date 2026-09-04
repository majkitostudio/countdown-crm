import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeTelnyxClientState, verifyTelnyxWebhookSignature } from "@/lib/telephony/telnyxServer";
import { mapTelnyxEventType } from "@/lib/telephony/telnyxLifecycle";

export const runtime = "nodejs";

type TelnyxEvent = {
  data?: {
    id?: string;
    event_type?: string;
    occurred_at?: string;
    payload?: Record<string, unknown>;
  };
};

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
    const event = JSON.parse(rawBody) as TelnyxEvent;
    const data = event.data;
    const payload = data?.payload || {};
    const eventId = data?.id;
    const eventType = data?.event_type;
    if (!eventId || !eventType) return NextResponse.json({ ok: true });

    const state = decodeTelnyxClientState(payload.client_state);
    const admin = createAdminClient();
    let query = admin.from("telephony_call_sessions").select("id,workspace_id").limit(1);
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
      occurred_at: data.occurred_at || null,
    });
    // Telnyx retries events. A duplicate event is already safely recorded.
    if (eventError && !eventError.message.toLowerCase().includes("duplicate") && !eventError.message.toLowerCase().includes("unique")) {
      throw eventError;
    }

    const status = mapTelnyxEventType(eventType);
    if (status) {
      await admin.from("telephony_call_sessions").update({
        status,
        telnyx_call_control_id: typeof payload.call_control_id === "string" ? payload.call_control_id : undefined,
        telnyx_call_leg_id: typeof payload.call_leg_id === "string" ? payload.call_leg_id : undefined,
        telnyx_call_session_id: typeof payload.call_session_id === "string" ? payload.call_session_id : undefined,
        started_at: eventType === "call.initiated" ? data.occurred_at || new Date().toISOString() : undefined,
        answered_at: eventType === "call.answered" ? data.occurred_at || new Date().toISOString() : undefined,
        ended_at: eventType === "call.hangup" ? data.occurred_at || new Date().toISOString() : undefined,
        from_number: typeof payload.from === "string" ? payload.from : undefined,
        to_number: typeof payload.to === "string" ? payload.to : undefined,
        hangup_cause: typeof payload.hangup_cause === "string" ? payload.hangup_cause : undefined,
      }).eq("id", session.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telnyx webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
