import { describe, expect, it } from "vitest";
import "./design-system-primitives.test.tsx";
import { getAllowedNavigationCommands, getCommandPalettePlaceholder } from "@/components/layout/headerNavigation";
import { getPageHeaderBadgeClassName } from "@/components/layout/PageHeader";
import { getStatusClassName } from "@/components/ui/Status";

describe("unified authenticated header foundations", () => {
  it("keeps privileged command destinations out of the Operator palette", () => {
    const operatorPaths = getAllowedNavigationCommands("operator").map((item) => item.path);

    expect(operatorPaths).toContain("/workspace");
    expect(operatorPaths).toContain("/products");
    expect(operatorPaths).not.toContain("/leads");
    expect(operatorPaths).not.toContain("/analytics");
    expect(operatorPaths).not.toContain("/monitor");
    expect(operatorPaths).not.toContain("/workflows");
    expect(operatorPaths).not.toContain("/team");
  });

  it("keeps privileged destinations available to their existing roles", () => {
    const leaderPaths = getAllowedNavigationCommands("team_leader").map((item) => item.path);
    const administratorPaths = getAllowedNavigationCommands("administrator").map((item) => item.path);

    expect(leaderPaths).toContain("/leads");
    expect(leaderPaths).toContain("/analytics");
    expect(leaderPaths).toContain("/exceptions");
    expect(leaderPaths).not.toContain("/team");
    expect(administratorPaths).toContain("/exceptions");
    expect(administratorPaths).toContain("/team");
  });

  it("uses truthful role-aware search copy and canonical status recipes", () => {
    expect(getCommandPalettePlaceholder("operator")).toBe("Type a product or page...");
    expect(getCommandPalettePlaceholder("administrator")).toContain("lead name");
    expect(getPageHeaderBadgeClassName("unavailable")).toBe(getStatusClassName("neutral"));
    expect(getPageHeaderBadgeClassName("success")).toBe(getStatusClassName("success"));
    expect(getPageHeaderBadgeClassName("warning")).toBe(getStatusClassName("warning"));
  });
});
