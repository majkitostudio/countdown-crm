import { NextResponse } from "next/server";
import { getWorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";
import { requireWorkspaceRole } from "@/lib/dal/workspace";

export async function GET() {
  await requireWorkspaceRole(["operator", "team_leader", "administrator"]);
  const settings = await getWorkspaceTelephonySettings();

  return NextResponse.json(
    { activeAdapter: settings.active_adapter },
    { headers: { "Cache-Control": "no-store" } },
  );
}
