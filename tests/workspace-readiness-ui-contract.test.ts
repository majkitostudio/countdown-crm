import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = resolve(process.cwd(), "src/app/readiness/page.tsx");
const panelPath = resolve(process.cwd(), "src/components/readiness/WorkspaceReadinessPanel.tsx");

describe("workspace readiness UI contract", () => {
  it("keeps the page administrator-only and server-rendered", () => {
    expect(existsSync(pagePath)).toBe(true);
    if (!existsSync(pagePath)) return;
    const page = readFileSync(pagePath, "utf8");

    expect(page).not.toMatch(/^"use client";/);
    expect(page).toContain("getWorkspaceReadinessForWorkspace");
    expect(page).toContain("WorkspaceReadinessPanel");
  });

  it("shows truthful status, details-on-demand, refresh and next actions", () => {
    expect(existsSync(panelPath)).toBe(true);
    if (!existsSync(panelPath)) return;
    const panel = readFileSync(panelPath, "utf8");

    expect(panel).toContain("Workspace Readiness");
    expect(panel).toContain("Needs attention");
    expect(panel).toContain("Blocked");
    expect(panel).toContain("<details");
    expect(panel).toContain("getWorkspaceReadinessAction");
    expect(panel).toContain("actionHref");
    expect(panel).toContain("checkedAt");
  });
});
