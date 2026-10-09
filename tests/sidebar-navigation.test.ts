import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllowedSidebarNavigationItems } from "@/components/layout/sidebarNavigation";

describe("role-aware sidebar navigation", () => {
  it("does not advertise administrator-only workflows to operators", () => {
    const operatorPaths = getAllowedSidebarNavigationItems("operator").map((item) => item.href);

    expect(operatorPaths).toContain("/workspace");
    expect(operatorPaths).not.toContain("/workflows");
  });

  it("keeps workflows available only to administrators", () => {
    expect(getAllowedSidebarNavigationItems("team_leader").map((item) => item.href)).not.toContain("/workflows");
    expect(getAllowedSidebarNavigationItems("administrator").map((item) => item.href)).toContain("/workflows");
  });

  it("shows the exception queue only to team leaders and administrators", () => {
    expect(getAllowedSidebarNavigationItems("operator").map((item) => item.href)).not.toContain("/exceptions");
    expect(getAllowedSidebarNavigationItems("team_leader").map((item) => item.href)).toContain("/exceptions");
    expect(getAllowedSidebarNavigationItems("administrator").map((item) => item.href)).toContain("/exceptions");
  });

  it("keeps ordinary operator-presence states neutral", () => {
    const sidebarSource = readFileSync(path.resolve(__dirname, "../src/components/layout/Sidebar.tsx"), "utf8");

    expect(sidebarSource).toContain('import { StatusBadge } from "@/components/ui/Status"');
    expect(sidebarSource).toContain('tone="neutral"');
  });
});
