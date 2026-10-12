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
    expect(component).toContain("/admin/settings#telephony-adapter");
  });

  it("keeps the parked adapter out of local user preferences and workspace settings", () => {
    const settings = readSource("src/lib/settings.ts");
    const personalSettings = readSource("src/app/settings/page.tsx");
    const workspaceSettings = readSource("src/components/settings/WorkspaceSettingsPanel.tsx");

    expect(settings).not.toContain("telephony");
    expect(workspaceSettings).not.toContain("TelephonyAdapterSettings");
    expect(personalSettings).not.toContain("TelephonyAdapterSettings");
    expect(personalSettings).not.toContain("saveUserSettings({ ...settings, active_adapter");
  });
});
