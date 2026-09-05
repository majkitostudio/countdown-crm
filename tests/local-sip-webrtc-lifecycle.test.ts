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

});
