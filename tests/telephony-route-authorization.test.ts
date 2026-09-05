import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  const path = join(process.cwd(), relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("telephony admin route contract", () => {
  it("guards the page with the administrator workspace role", () => {
    const page = readSource("src/app/telephony/page.tsx");

    expect(page).toContain('requireWorkspaceRole(["administrator"])');
    expect(page).toContain("TelephonyAdminPanel");
    expect(page).toContain("/settings#telephony-adapter");
    expect(page).toContain("Local SIP is not active");
  });

  it("returns safe local status without exposing environment values", () => {
    const route = readSource("src/app/api/telephony/local/status/route.ts");

    expect(route).toContain('requireWorkspaceRole(["administrator"])');
    expect(route).toContain("activeAdapter");
    expect(route).toContain("1001");
    expect(route).toContain("1002");
    expect(route).toContain("Unavailable");
    expect(route).not.toContain("process.env");
    expect(route).not.toContain("SECRET");
  });

  it("keeps the first admin panel truthful about local-only boundaries", () => {
    const panel = readSource("src/components/telephony/TelephonyAdminPanel.tsx");

    expect(panel).toContain("Local only");
    expect(panel).toContain("Public PSTN disabled");
    expect(panel).toContain("Recording disabled");
    expect(panel).toContain("Telnyx blocked");
  });
});
