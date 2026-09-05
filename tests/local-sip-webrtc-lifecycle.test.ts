import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  const path = join(process.cwd(), relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("Local SIP WebRTC lifecycle contract", () => {
  it("pins SIP.js and exposes browser call controls", () => {
    const packageJson = readSource("package.json");
    const adapter = readSource("src/lib/telephony/localSipAdapter.ts");

    expect(packageJson).toContain('"sip.js": "0.21.2"');
    expect(adapter).toContain("connect");
    expect(adapter).toContain("register");
    expect(adapter).toContain("dial");
    expect(adapter).toContain("hangup");
    expect(adapter).toContain("toggleMute");
    expect(adapter).toContain("toggleHold");
    expect(adapter).toContain("sendDtmf");
  });

  it("reports ringing only from SIP provisional responses", () => {
    const adapter = readSource("src/lib/telephony/localSipAdapter.ts");

    expect(adapter).toContain("onProgress");
    expect(adapter).toContain("statusCode === 180");
    expect(adapter).toContain("statusCode === 183");
    expect(adapter).not.toContain('this.onState?.("ringing");\n    await this.user.call');
  });

});
