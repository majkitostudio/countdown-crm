import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  const path = join(process.cwd(), relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("server-backed telephony adapter boundary", () => {
  it("defines the complete adapter vocabulary and blocks Telnyx activation", () => {
    const source = readSource("src/lib/telephony/telephonyAdapter.ts");

    expect(source).toContain('"simulation" | "local_sip" | "telnyx"');
    expect(source).toContain('"local_sip" | "telnyx"');
    expect(source).toContain("isTelnyxActivationBlocked");
    expect(source).toContain("Telnyx activation is currently blocked");
  });

  it("derives the workspace on the server and uses the safe simulation fallback", () => {
    const dal = readSource("src/lib/dal/telephonySettings.ts");

    expect(dal).toContain("requireWorkspaceContext");
    expect(dal).toContain('requireWorkspaceRole(["administrator"])');
    expect(dal).toContain('.from("workspace_telephony_settings")');
    expect(dal).toContain('active_adapter: "simulation"');
    expect(dal).toContain("createAuditLogForWorkspace");
    expect(dal).not.toContain("localStorage");
  });

  it("exposes authenticated Server Actions instead of trusting browser workspace IDs", () => {
    const actions = readSource("src/app/actions/telephonySettings.ts");

    expect(actions).toContain('"use server"');
    expect(actions).toContain("getWorkspaceTelephonySettings");
    expect(actions).toContain("updateWorkspaceTelephonyAdapter");
    expect(actions).not.toContain("workspaceId:");
  });
});
