import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllowedSidebarNavigationItems } from "@/components/layout/sidebarNavigation";

describe("role-aware sidebar navigation", () => {
  it("does not advertise administrator-only workflows to operators", () => {
    const operatorPaths = getAllowedSidebarNavigationItems("operator").map((item) => item.href);

    expect(operatorPaths).toContain("/console");
    expect(operatorPaths).not.toContain("/automations");
  });

  it("moves administrator-only workflows behind the Admin Hub", () => {
    const teamLeaderPaths = getAllowedSidebarNavigationItems("team_leader").map((item) => item.href);
    const administratorPaths = getAllowedSidebarNavigationItems("administrator").map((item) => item.href);

    expect(teamLeaderPaths).not.toContain("/automations");
    expect(teamLeaderPaths).not.toContain("/admin");
    expect(administratorPaths).not.toContain("/automations");
    expect(administratorPaths).toContain("/admin");
  });

  it("shows the exception queue only to team leaders and administrators", () => {
    expect(getAllowedSidebarNavigationItems("operator").map((item) => item.href)).not.toContain("/team/exceptions");
    expect(getAllowedSidebarNavigationItems("team_leader").map((item) => item.href)).toContain("/team/exceptions");
    expect(getAllowedSidebarNavigationItems("administrator").map((item) => item.href)).toContain("/team/exceptions");
  });

  it("keeps ordinary operator-presence states neutral", () => {
    const sidebarSource = readFileSync(path.resolve(__dirname, "../src/components/layout/Sidebar.tsx"), "utf8");

    expect(sidebarSource).toContain('import { StatusBadge } from "@/components/ui/Status"');
    expect(sidebarSource).toContain('tone="neutral"');
  });
});
