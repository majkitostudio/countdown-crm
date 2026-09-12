import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = resolve(process.cwd(), "src/app/readiness/page.tsx");
const panelPath = resolve(process.cwd(), "src/components/readiness/WorkspaceReadinessPanel.tsx");
const navigationPath = resolve(process.cwd(), "src/components/layout/navigation.ts");

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

    expect(panel).toContain('title="Control Checkpoint"');
    expect(panel).toContain("Attention");
    expect(panel).toContain("Blocked");
    expect(panel).toContain("<details");
    expect(panel).toContain("getWorkspaceReadinessAction");
    expect(panel).toContain("actionHref");
    expect(panel).toContain("checkedAt");
  });

  it("uses concise status copy and keeps the status icon only in the right badge", () => {
    expect(existsSync(panelPath)).toBe(true);
    if (!existsSync(panelPath)) return;
    const panel = readFileSync(panelPath, "utf8");
    const summary = panel.slice(panel.indexOf("<summary"), panel.indexOf("</summary>"));

    expect(panel).toContain('label: "Attention"');
    expect(panel).not.toContain('label: "Needs attention"');
    expect(panel).toContain('<MetricCard label="Attention"');
    expect(panel).toContain('<SharedStatusBadge tone={tone} className="gap-2.5">');
    expect(summary).not.toContain("<StatusIcon status={check.status} />");
    expect(summary).toContain("<ReadinessStatusBadge status={check.status} />");
  });

  it("names the administrative surface Control Checkpoint everywhere it is displayed", () => {
    const page = readFileSync(pagePath, "utf8");
    const navigation = readFileSync(navigationPath, "utf8");

    expect(page).toContain('title="Control Checkpoint"');
    expect(page).toContain("Control Checkpoint unavailable");
    expect(navigation).toContain('label: "Control Checkpoint"');
    expect(navigation).not.toContain('label: "Workspace Readiness"');
  });
});
