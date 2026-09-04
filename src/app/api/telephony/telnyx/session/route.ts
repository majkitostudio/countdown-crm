import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { createDataClient } from "@/lib/dal/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneNumber } from "@/lib/telephony/phoneNumber";
import type { TelephonyCallStatus } from "@/lib/telephony/telnyxLifecycle";

export const runtime = "nodejs";

type SessionStatus = TelephonyCallStatus;

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Telephony session request failed.";
  const status = message.includes("Unauthorized") ? 401 : message.includes("permissions") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const context = await requireWorkspaceRole(["operator", "team_leader", "administrator"]);
    const body = await request.json() as { leadId?: string; queueItemId?: string; toNumber?: string };
    const toNumber = body.toNumber ? normalizePhoneNumber(body.toNumber) : null;
    if (!body.leadId || !toNumber) return NextResponse.json({ error: "A valid lead and E.164 phone number are required." }, { status: 400 });

    const dataClient = await createDataClient();
    const { data: lead, error: leadError } = await dataClient
      .from("leads")
      .select("id")
      .eq("id", body.leadId)
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();
    if (leadError || !lead) return NextResponse.json({ error: "Lead is not available in this workspace." }, { status: 404 });

    if (body.queueItemId) {
      const { data: queueItem, error: queueError } = await dataClient
        .from("lead_queue_items")
        .select("id")
        .eq("id", body.queueItemId)
        .eq("lead_id", body.leadId)
        .eq("workspace_id", context.workspaceId)
        .eq("assigned_operator_id", context.userId)
        .in("state", ["assigned", "in_progress"])
        .maybeSingle();
      if (queueError || !queueItem) return NextResponse.json({ error: "The lead assignment is no longer available." }, { status: 409 });
    }

    const { data: session, error } = await createAdminClient()
      .from("telephony_call_sessions")
      .insert({
        workspace_id: context.workspaceId,
        lead_id: body.leadId,
        queue_item_id: body.queueItemId || null,
        operator_id: context.userId,
        provider: "telnyx",
        direction: "outbound",
        to_number: toNumber,
        status: "initiated",
      })
      .select("id")
      .single();
    if (error || !session) throw new Error("Could not create the telephony session.");
    return NextResponse.json({ sessionId: session.id, toNumber });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireWorkspaceRole(["operator", "team_leader", "administrator"]);
    const body = await request.json() as {
      sessionId?: string;
      status?: SessionStatus;
      telnyxCallControlId?: string;
      telnyxCallLegId?: string;
      telnyxCallSessionId?: string;
    };
    if (!body.sessionId || !body.status) return NextResponse.json({ error: "Session ID and status are required." }, { status: 400 });

    const { error } = await createAdminClient()
      .from("telephony_call_sessions")
      .update({
        status: body.status,
        telnyx_call_control_id: body.telnyxCallControlId || undefined,
        telnyx_call_leg_id: body.telnyxCallLegId || undefined,
        telnyx_call_session_id: body.telnyxCallSessionId || undefined,
        answered_at: body.status === "connected" ? new Date().toISOString() : undefined,
        ended_at: ["ended", "failed"].includes(body.status) ? new Date().toISOString() : undefined,
      })
      .eq("id", body.sessionId)
      .eq("workspace_id", context.workspaceId)
      .eq("operator_id", context.userId);
    if (error) throw new Error("Could not update the telephony session.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
