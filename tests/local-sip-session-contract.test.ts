import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  const path = join(process.cwd(), relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("shared telephony session contract", () => {
  it("provides provider-neutral session creation and monotonic transitions", () => {
    const dal = readSource("src/lib/dal/telephonySessions.ts");

    expect(dal).toContain("createTelephonySession");
    expect(dal).toContain("transitionTelephonySession");
    expect(dal).toContain("provider_call_id");
    expect(dal).toContain("getAllowedPreviousStatuses");
    expect(dal).toContain("workspace_id");
    expect(dal).toContain("operator_id");
  });

  it("provides a local session route bound to the active local adapter", () => {
    const route = readSource("src/app/api/telephony/local/session/route.ts");

    expect(route).toContain("requireWorkspaceRole");
    expect(route).toContain("getActiveTelephonyAdapter");
    expect(route).toContain('"local_sip"');
    expect(route).toContain("createTelephonySession");
    expect(route).toContain("transitionTelephonySession");
  });

  it("keeps local lab sessions on internal extensions instead of public numbers", () => {
    const route = readSource("src/app/api/telephony/local/session/route.ts");
    const controller = readSource("src/lib/telephony/softphone.ts");

    expect(route).toContain('"1001"');
    expect(route).toContain('"1002"');
    expect(controller).toContain('toNumber: "1002"');
  });
});
