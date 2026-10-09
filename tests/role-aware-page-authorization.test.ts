import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowsPage = readFileSync(resolve(process.cwd(), "src/app/workflows/page.tsx"), "utf8");

describe("role-aware page authorization", () => {
  it("guards workflows at the server page boundary", () => {
    expect(workflowsPage).not.toMatch(/^"use client";/);
    expect(workflowsPage).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
  });

  it("guards real call review at the server page boundary", () => {
    const callReviewPage = readFileSync(
      resolve(process.cwd(), "src/app/calls/[callId]/review/page.tsx"),
      "utf8",
    );

    expect(callReviewPage).not.toMatch(/^"use client";/);
    expect(callReviewPage).toContain('requireWorkspaceRole(["operator", "team_leader", "administrator"])');
  });
});
