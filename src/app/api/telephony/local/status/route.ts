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
      // Asterisk's HTTP server intentionally returns 403 for its static root.
      // Any response below 500 proves the local HTTP service is reachable;
      // fetch() throwing is the unavailable case.
      const response = await fetch("http://127.0.0.1:8088/static/", { cache: "no-store" });
      asterisk = response.status < 500 ? "Available" : "Unavailable";
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
