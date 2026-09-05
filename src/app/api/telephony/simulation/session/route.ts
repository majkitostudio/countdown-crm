import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { createTelephonySession, transitionTelephonySession } from "@/lib/dal/telephonySessions";
import { recordTelephonyEvent } from "@/lib/dal/telephonyEvents";
import { getActiveTelephonyAdapter } from "@/lib/dal/telephonySettings";
import { isSessionStatus } from "@/lib/telephony/sessionTransitions";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const status = error instanceof DataAccessError
    ? error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : error.code === "DATABASE" ? 500 : 400
    : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Simulation session request failed." }, { status });
}

async function requireSimulationContext() {
  const context = await requireWorkspaceRole(["operator", "team_leader", "administrator"]);
  if (await getActiveTelephonyAdapter() !== "simulation") {
    throw new DataAccessError("VALIDATION", "Simulation adapter is not active.");
  }
  return context;
}

export async function POST(request: Request) {
  try {
    const context = await requireSimulationContext();
    const body = await request.json() as { leadId?: unknown; queueItemId?: unknown; toNumber?: unknown };
    if (typeof body.leadId !== "string" || !body.leadId.trim() || typeof body.toNumber !== "string" || !body.toNumber.trim()) {
      return NextResponse.json({ error: "A lead and destination number are required." }, { status: 400 });
    }
    const queueItemId = typeof body.queueItemId === "string" && body.queueItemId.trim() ? body.queueItemId : null;
    const dataClient = await createDataClient();
    const { data: lead, error: leadError } = await dataClient
      .from("leads")
      .select("id")
      .eq("id", body.leadId)
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();
    if (leadError || !lead) return NextResponse.json({ error: "Lead is not available in this workspace." }, { status: 404 });

    if (queueItemId) {
      const { data: queueItem, error: queueError } = await dataClient
        .from("lead_queue_items")
        .select("id")
        .eq("id", queueItemId)
        .eq("lead_id", body.leadId)
        .eq("workspace_id", context.workspaceId)
        .eq("assigned_operator_id", context.userId)
        .in("state", ["assigned", "in_progress", "awaiting_outcome"])
        .maybeSingle();
      if (queueError || !queueItem) return NextResponse.json({ error: "The lead assignment is no longer available." }, { status: 409 });
    }

    const session = await createTelephonySession({
      workspaceId: context.workspaceId,
      operatorId: context.userId,
      provider: "simulation",
      leadId: body.leadId,
      queueItemId,
      toNumber: body.toNumber,
      direction: "outbound",
    });
    await recordTelephonyEvent({
      workspaceId: context.workspaceId,
      sessionId: session.sessionId,
      provider: "simulation",
      eventId: `simulation:${session.sessionId}:initiated`,
      eventType: "simulation.session.initiated",
    });
    return NextResponse.json({ ...session, toNumber: body.toNumber });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireSimulationContext();
    const body = await request.json() as { sessionId?: unknown; status?: unknown; occurredAt?: unknown };
    if (typeof body.sessionId !== "string" || typeof body.status !== "string" || !isSessionStatus(body.status)) {
      return NextResponse.json({ error: "Session ID and a supported status are required." }, { status: 400 });
    }
    const occurredAt = typeof body.occurredAt === "string" ? body.occurredAt : null;
    const result = await transitionTelephonySession({
      sessionId: body.sessionId,
      workspaceId: context.workspaceId,
      operatorId: context.userId,
      status: body.status,
      occurredAt,
    });
    await recordTelephonyEvent({
      workspaceId: context.workspaceId,
      sessionId: body.sessionId,
      provider: "simulation",
      eventId: `simulation:${body.sessionId}:${result.status}`,
      eventType: `simulation.session.${result.status}`,
      occurredAt,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
