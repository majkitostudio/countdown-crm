import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const route = readFileSync("src/app/api/telephony/adapter/route.ts", "utf8");
const client = readFileSync("src/lib/telephony/telephonyAdapterClient.ts", "utf8");

describe("telephony adapter route contract", () => {
  it("is restricted to workspace users who can operate calls", () => {
    expect(route).toContain('requireWorkspaceRole(["operator", "team_leader", "administrator"])');
    expect(route).toContain("getWorkspaceTelephonySettings");
  });

  it("returns only the active adapter and prevents caching", () => {
    expect(route).toContain("activeAdapter: settings.active_adapter");
    expect(route).toContain('"Cache-Control": "no-store"');
    expect(route).not.toContain("password");
  });

  it("validates the client response before the call controller uses it", () => {
    expect(client).toContain("/api/telephony/adapter");
    expect(client).toContain('body.activeAdapter !== "local_sip"');
  });
});
