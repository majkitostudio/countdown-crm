import { describe, expect, it } from "vitest";
import { getAllowedWorkspaceNavigationItems } from "@/components/layout/navigation";

describe("Planner navigation and renaming contract", () => {
  it.each(["operator", "team_leader", "administrator"] as const)(
    "exposes /calendar under the label 'Schedule' for role %s",
    (role) => {
      const items = getAllowedWorkspaceNavigationItems(role);
      const plannerItem = items.find((item) => item.href === "/schedule");

      expect(plannerItem).toBeDefined();
      expect(plannerItem?.label).toBe("Schedule");
    },
  );

  it("does not advertise legacy 'My Calendar' label in navigation", () => {
    for (const role of ["operator", "team_leader", "administrator"] as const) {
      const labels = getAllowedWorkspaceNavigationItems(role).map((item) => item.label);
      expect(labels).not.toContain("My Calendar");
    }
  });
});
