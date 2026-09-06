import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const monitorPage = readFileSync(resolve(process.cwd(), "src/app/monitor/page.tsx"), "utf8");

describe("role-aware page authorization", () => {
  it("guards the live monitor at the server page boundary", () => {
    expect(monitorPage).not.toMatch(/^"use client";/);
    expect(monitorPage).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
  });
});
