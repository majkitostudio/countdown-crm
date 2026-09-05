import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { createTelephonySession, transitionTelephonySession } from "@/lib/dal/telephonySessions";
import { getActiveTelephonyAdapter } from "@/lib/dal/telephonySettings";
import { normalizePhoneNumber } from "@/lib/telephony/phoneNumber";
import { isSessionStatus } from "@/lib/telephony/sessionTransitions";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const status = error instanceof DataAccessError
    ? error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : error.code === "DATABASE" ? 500 : 400
    : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Local SIP session request failed." }, { status });
}

async function requireLocalSipContext() {
  const context = await requireWorkspaceRole(["operator", "team_leader", "administrator"]);
  const adapter = await getActiveTelephonyAdapter();
  if (adapter !== "local_sip") throw new DataAccessError("VALIDATION", "Local SIP adapter is not active.");
  return context;
}

export async function POST(request: Request) {
  try {
    const context = await requireLocalSipContext();
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

    const session = await createTelephonySession({
      workspaceId: context.workspaceId,
      operatorId: context.userId,
      provider: "local_sip",
      leadId: body.leadId,
      queueItemId: body.queueItemId || null,
      toNumber,
      direction: "outbound",
    });
    return NextResponse.json({ ...session, toNumber });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireLocalSipContext();
    const body = await request.json() as { sessionId?: string; status?: string; providerCallId?: string; occurredAt?: string };
    if (!body.sessionId || !body.status || !isSessionStatus(body.status)) {
      return NextResponse.json({ error: "Session ID and a supported status are required." }, { status: 400 });
    }
    const result = await transitionTelephonySession({
      sessionId: body.sessionId,
      workspaceId: context.workspaceId,
      operatorId: context.userId,
      status: body.status,
      providerCallId: body.providerCallId || null,
      occurredAt: body.occurredAt || null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
