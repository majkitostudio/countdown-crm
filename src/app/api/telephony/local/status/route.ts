import { NextResponse } from "next/server";
import { getWorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { listActiveTelephonySessions, listRecentTelephonyEvents } from "@/lib/dal/telephonyEvents";

export async function GET() {
  const context = await requireWorkspaceRole(["administrator"]);
  const settings = await getWorkspaceTelephonySettings();
  let asterisk: "Available" | "Unavailable" = "Unavailable";

  if (settings.active_adapter === "local_sip") {
    try {
      const response = await fetch("http://127.0.0.1:8088/httpstatus", { cache: "no-store" });
      asterisk = response.ok ? "Available" : "Unavailable";
    } catch {
      asterisk = "Unavailable";
    }
  }

  const [activeCalls, recentEvents] = await Promise.all([
    listActiveTelephonySessions(context.workspaceId, 20),
    listRecentTelephonyEvents(context.workspaceId, 20),
  ]);

  return NextResponse.json({
    workspaceId: context.workspaceId,
    activeAdapter: settings.active_adapter,
    asterisk,
    extensions: ["1001", "1002"],
    extensionRegistration: [
      { extension: "1001", status: "configured" },
      { extension: "1002", status: "configured" },
    ],
    activeCalls,
    recentEvents,
    boundaries: {
      localOnly: true,
      publicPstn: "disabled",
      recording: "disabled",
      telnyx: "blocked",
    },
  });
}
