import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  const path = join(process.cwd(), relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("Local SIP settings UI contract", () => {
  it("provides a stable admin adapter anchor and the two planned provider choices", () => {
    const component = readSource("src/components/settings/TelephonyAdapterSettings.tsx");

    expect(component).toContain('id="telephony-adapter"');
    expect(component).toContain("Local SIP");
    expect(component).toContain("Telnyx adapter");
    expect(component).toContain("disabled");
    expect(component).toContain("href=\"/telephony\"");
    expect(component).toContain("/settings#telephony-adapter");
  });

  it("keeps the adapter out of local user preferences", () => {
    const settings = readSource("src/lib/settings.ts");
    const page = readSource("src/app/settings/page.tsx");

    expect(settings).not.toContain("telephony");
    expect(page).toContain("TelephonyAdapterSettings");
    expect(page).not.toContain("saveUserSettings({ ...settings, active_adapter");
  });
});
