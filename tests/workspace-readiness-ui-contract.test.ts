import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  const path = resolve(process.cwd(), relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("workspace health strip UI contract", () => {
  it("is a server component and surfaces only actionable business checks", () => {
    const strip = readSource("src/components/admin/WorkspaceHealthStrip.tsx");

    expect(strip).not.toMatch(/^"use client";/);
    expect(strip).toContain("WorkspaceHealthStrip");
    for (const businessKey of [
      "calendar",
      "wallet",
      "lead_queue",
      "published_scripts",
      "workflows",
      "critical_errors",
    ]) {
      expect(strip).toContain(`"${businessKey}"`);
    }
    for (const technicalKey of [
      "local_sip",
      "telnyx",
      "migration_history",
      "role_boundaries",
    ]) {
      expect(strip).not.toContain(`"${technicalKey}"`);
    }
    expect(strip).toContain("actionHref");
    expect(strip).toContain('from "@/components/ui/Surface"');
  });

  it("lives on the Management page instead of the retired /controls checkpoint", () => {
    const adminPage = readSource("src/app/admin/page.tsx");

    expect(adminPage).toContain("WorkspaceHealthStrip");
    expect(adminPage).toContain("getWorkspaceReadinessForWorkspace");
    expect(adminPage).toContain("Workspace health is unavailable");

    const retiredPagePath = resolve(process.cwd(), "src/app/controls/page.tsx");
    const retiredPanelPath = resolve(
      process.cwd(),
      "src/components/readiness/WorkspaceReadinessPanel.tsx",
    );
    expect(existsSync(retiredPagePath)).toBe(false);
    expect(existsSync(retiredPanelPath)).toBe(false);
  });

  it("keeps the health surface out of global navigation while Management stays the hub", () => {
    const navigation = readSource("src/components/layout/navigation.ts");

    expect(navigation).not.toContain('label: "Readiness"');
    expect(navigation).not.toContain('label: "Workspace Readiness"');
  });
});