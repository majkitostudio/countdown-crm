import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { createDataClient } from "@/lib/dal/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneNumber } from "@/lib/telephony/phoneNumber";
import { canTransitionCallStatus, type TelephonyCallStatus } from "@/lib/telephony/telnyxLifecycle";
import { getAllowedPreviousStatuses, isSessionStatus } from "@/lib/telephony/sessionTransitions";

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
    if (!isSessionStatus(body.status)) return NextResponse.json({ error: "Unsupported telephony session status." }, { status: 400 });

    const status = body.status as TelephonyCallStatus;
    const admin = createAdminClient();
    const { data: existingSession, error: lookupError } = await admin
      .from("telephony_call_sessions")
      .select("id,status")
      .eq("id", body.sessionId)
      .eq("workspace_id", context.workspaceId)
      .eq("operator_id", context.userId)
      .maybeSingle();
    if (lookupError) throw new Error("Could not read the telephony session.");
    if (!existingSession) return NextResponse.json({ error: "Telephony session is not available." }, { status: 404 });

    if (!isSessionStatus(existingSession.status)) throw new Error("Stored telephony session has an invalid status.");
    const currentStatus: TelephonyCallStatus = existingSession.status;
    if (!canTransitionCallStatus(currentStatus, status)) {
      return NextResponse.json({ error: "The telephony session has already moved past this state." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const enteredConnected = status === "connected" && currentStatus !== "connected";
    const enteredTerminal = ["ended", "failed"].includes(status) && currentStatus !== status;
    const { data: updatedSession, error } = await admin
      .from("telephony_call_sessions")
      .update({
        status,
        telnyx_call_control_id: body.telnyxCallControlId?.trim() || undefined,
        telnyx_call_leg_id: body.telnyxCallLegId?.trim() || undefined,
        telnyx_call_session_id: body.telnyxCallSessionId?.trim() || undefined,
        answered_at: enteredConnected ? now : undefined,
        ended_at: enteredTerminal ? now : undefined,
      })
      .eq("id", body.sessionId)
      .eq("workspace_id", context.workspaceId)
      .eq("operator_id", context.userId)
      .in("status", getAllowedPreviousStatuses(status))
      .select("id,status")
      .maybeSingle();
    if (error) throw new Error("Could not update the telephony session.");
    if (!updatedSession) return NextResponse.json({ error: "The telephony session changed before this update." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
