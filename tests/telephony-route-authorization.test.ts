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

  it("checks the Asterisk HTTP server using a real endpoint", () => {
    const route = readSource("src/app/api/telephony/local/status/route.ts");

    expect(route).toContain("http://127.0.0.1:8088/static/");
    expect(route).toContain("response.status < 500");
  });

  it("keeps the first admin panel truthful about local-only boundaries", () => {
    const panel = readSource("src/components/telephony/TelephonyAdminPanel.tsx");

    expect(panel).toContain("Local only");
    expect(panel).toContain("Public PSTN disabled");
    expect(panel).toContain("Recording disabled");
    expect(panel).toContain("Telnyx blocked");
  });
});

describe("call session script snapshot contract", () => {
  const sessionRoutes = [
    "src/app/api/telephony/simulation/session/route.ts",
    "src/app/api/telephony/local/session/route.ts",
    "src/app/api/telephony/telnyx/session/route.ts",
  ];

  it.each(sessionRoutes)("captures the selected product in %s", (relativePath) => {
    const route = readSource(relativePath);

    expect(route).toMatch(/productId\?:\s*(?:unknown|string)/);
    expect(route).toMatch(/productId:[^\r\n]*body\.productId/);
  });

  it.each(sessionRoutes)("returns the server-owned snapshot from %s", (relativePath) => {
    const route = readSource(relativePath);

    expect(route).toMatch(/return NextResponse\.json\(\{[^}]*?(?:\.\.\.session|scriptSnapshot:\s*session\.scriptSnapshot)/);
  });
});
