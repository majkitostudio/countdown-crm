import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  const path = join(process.cwd(), relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("Local SIP runtime bootstrap contract", () => {
  it("requires authenticated workspace membership and uses server-only credentials", () => {
    const route = readSource("src/app/api/telephony/local/bootstrap/route.ts");
    const server = readSource("src/lib/telephony/localSipServer.ts");

    expect(route).toContain("requireWorkspaceRole");
    expect(route).toContain("getLocalSipBootstrap");
    expect(route).toContain('"operator", "team_leader", "administrator"');
    expect(server).toContain("process.env.SIP_PASSWORD_1001");
    expect(server).toContain("ws://127.0.0.1:8088/ws");
    expect(server).toContain("expiresAt");
  });

  it("does not persist or expose bootstrap credentials through settings storage", () => {
    const route = readSource("src/app/api/telephony/local/bootstrap/route.ts");
    const settings = readSource("src/lib/settings.ts");

    expect(route).not.toContain("localStorage");
    expect(route).not.toContain("telephony_call_sessions");
    expect(settings).not.toContain("SIP_PASSWORD");
  });
});
