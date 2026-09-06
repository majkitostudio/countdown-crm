import { describe, expect, it } from "vitest";
import { getAllowedSidebarNavigationItems } from "@/components/layout/sidebarNavigation";

describe("role-aware sidebar navigation", () => {
  it("does not advertise custom objects to operators", () => {
    const operatorPaths = getAllowedSidebarNavigationItems("operator").map((item) => item.href);

    expect(operatorPaths).toContain("/workspace");
    expect(operatorPaths).not.toContain("/objects/deals");
  });

  it("keeps custom objects available to team leaders and administrators", () => {
    expect(getAllowedSidebarNavigationItems("team_leader").map((item) => item.href)).toContain("/objects/deals");
    expect(getAllowedSidebarNavigationItems("administrator").map((item) => item.href)).toContain("/objects/deals");
  });

  it("shows the exception queue only to team leaders and administrators", () => {
    expect(getAllowedSidebarNavigationItems("operator").map((item) => item.href)).not.toContain("/exceptions");
    expect(getAllowedSidebarNavigationItems("team_leader").map((item) => item.href)).toContain("/exceptions");
    expect(getAllowedSidebarNavigationItems("administrator").map((item) => item.href)).toContain("/exceptions");
  });
});
