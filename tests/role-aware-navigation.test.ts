import { describe, expect, it } from "vitest";
import { getAllowedNavigationCommands } from "@/components/layout/headerNavigation";
import { getAllowedSidebarNavigationItems } from "@/components/layout/sidebarNavigation";

function sidebarPaths(role: "operator" | "team_leader" | "administrator") {
  return getAllowedSidebarNavigationItems(role).map((item) => item.href).sort();
}

function commandPaths(role: "operator" | "team_leader" | "administrator") {
  return getAllowedNavigationCommands(role).map((item) => item.path).sort();
}

describe("role-aware navigation parity", () => {
  it.each(["operator", "team_leader", "administrator"] as const)(
    "exposes the same destinations in the sidebar and command palette for %s",
    (role) => {
      expect(commandPaths(role)).toEqual(sidebarPaths(role));
    },
  );

  it("keeps the operator away from supervisor and administration destinations", () => {
    const operatorPaths = sidebarPaths("operator");
    const restrictedPaths = [
      "/audit",
      "/analytics",
      "/exceptions",
      "/leads",
      "/monitor",
      "/objects/deals",
      "/settings/scripts",
      "/team",
      "/training/reviews",
      "/workflows",
    ];

    expect(operatorPaths).toEqual(expect.not.arrayContaining(restrictedPaths));
  });
});
