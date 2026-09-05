import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { getActiveTelephonyAdapter } from "@/lib/dal/telephonySettings";
import { getLocalSipBootstrap } from "@/lib/telephony/localSipServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireWorkspaceRole(["operator", "team_leader", "administrator"]);
    if (await getActiveTelephonyAdapter() !== "local_sip") {
      return NextResponse.json({ error: "Local SIP adapter is not active." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(getLocalSipBootstrap(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local SIP bootstrap failed.";
    const status = message.includes("Unauthorized") ? 401 : message.includes("permissions") ? 403 : 503;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
