import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(relativePath, "utf8");
}

describe("telephony admin diagnostics contract", () => {
  it("loads capped active calls and safe recent events", () => {
    const eventDal = readSource("src/lib/dal/telephonyEvents.ts");
    const panel = readSource("src/components/telephony/TelephonyAdminPanel.tsx");

    expect(eventDal).toContain("listActiveTelephonySessions");
    expect(eventDal).toContain("listRecentTelephonyEvents");
    expect(eventDal).toContain("Math.min");
    expect(panel).toContain("activeCalls");
    expect(panel).toContain("recentEvents");
    expect(panel).not.toContain("payload");
  });

  it("offers a controlled 1001 to 1002 test call without duplicate submits", () => {
    const route = readSource("src/app/api/telephony/local/test-call/route.ts");
    const panel = readSource("src/components/telephony/TelephonyAdminPanel.tsx");

    expect(route).toContain('requireWorkspaceRole(["administrator"])');
    expect(route).toContain('"1001"');
    expect(route).toContain('"1002"');
    expect(route).toContain("createTelephonySession");
    expect(panel).toContain("prepareLocalSipTestCall");
    expect(panel).toContain("isTestCallPending");
  });

  it("keeps the diagnostic surface local-only and secret-free", () => {
    const panel = readSource("src/components/telephony/TelephonyAdminPanel.tsx");

    expect(panel).toContain("Public PSTN disabled");
    expect(panel).toContain("Recording disabled");
    expect(panel).toContain("Telnyx blocked");
    expect(panel).not.toContain("password");
    expect(panel).not.toContain("token");
  });
});
