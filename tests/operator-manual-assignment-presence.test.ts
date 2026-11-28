import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const consolePage = readFileSync(resolve(process.cwd(), "src/app/console/page.tsx"), "utf8");

describe("manual operator assignment presence", () => {
  it("refreshes availability before showing a manually assigned lead", () => {
    const assignmentLoad = consolePage.slice(
      consolePage.indexOf("let currentAssignment = hasLiveCall"),
      consolePage.indexOf("setActiveLead(currentAssignment?.lead || null)", consolePage.indexOf("let currentAssignment = hasLiveCall")),
    );

    const assignedBranchStart = assignmentLoad.indexOf('if (currentAssignment?.assignment_state === "assigned")');
    const assignedBranchEnd = assignmentLoad.indexOf("} else if (!currentAssignment)", assignedBranchStart);
    const availabilityRefresh = assignmentLoad.indexOf('await setOperatorPresenceAction("available")', assignedBranchStart);

    expect(assignedBranchStart).toBeGreaterThanOrEqual(0);
    expect(availabilityRefresh).toBeGreaterThan(assignedBranchStart);
    expect(availabilityRefresh).toBeLessThan(assignedBranchEnd);
    expect(assignmentLoad.match(/await setOperatorPresenceAction\("available"\)/g)).toHaveLength(2);
  });
});
