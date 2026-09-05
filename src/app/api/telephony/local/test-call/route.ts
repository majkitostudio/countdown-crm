import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { DataAccessError } from "@/lib/dal/errors";
import { createTelephonySession } from "@/lib/dal/telephonySessions";
import { recordTelephonyEvent } from "@/lib/dal/telephonyEvents";
import { getActiveTelephonyAdapter } from "@/lib/dal/telephonySettings";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const status = error instanceof DataAccessError
    ? error.code === "FORBIDDEN" ? 403 : error.code === "DATABASE" ? 500 : 400
    : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Local SIP test call failed." }, { status });
}

export async function POST(request: Request) {
  try {
    const context = await requireWorkspaceRole(["administrator"]);
    if (await getActiveTelephonyAdapter() !== "local_sip") {
      throw new DataAccessError("VALIDATION", "Local SIP adapter is not active.");
    }

    const body = await request.json().catch(() => ({})) as { fromExtension?: string; toExtension?: string };
    const fromExtension = body.fromExtension || "1001";
    const toExtension = body.toExtension || "1002";
    const validPair = (fromExtension === "1001" && toExtension === "1002") || (fromExtension === "1002" && toExtension === "1001");
    if (!validPair) return NextResponse.json({ error: "Only the internal 1001 ↔ 1002 test call is allowed." }, { status: 400 });

    const session = await createTelephonySession({
      workspaceId: context.workspaceId,
      operatorId: context.userId,
      provider: "local_sip",
      leadId: null,
      queueItemId: null,
      toNumber: toExtension,
      direction: "outbound",
    });
    await recordTelephonyEvent({
      workspaceId: context.workspaceId,
      sessionId: session.sessionId,
      provider: "local_sip",
      eventId: `local:${session.sessionId}:initiated`,
      eventType: "local_sip.session.initiated",
    });

    return NextResponse.json({ ...session, fromExtension, toExtension });
  } catch (error) {
    return errorResponse(error);
  }
}
