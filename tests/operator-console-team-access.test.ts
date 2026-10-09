import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspacePage = readFileSync(
  resolve(process.cwd(), "src/app/workspace/page.tsx"),
  "utf8",
);

describe("operator console team access", () => {
  it("shows a permission error when an operator has no active team", () => {
    expect(workspacePage).toContain('const MISSING_ACTIVE_TEAM_ERROR = "Operator is not assigned to an active team"');
    expect(workspacePage).toContain("setTeamAssignmentRequired(true)");
    expect(workspacePage).toContain("Přístup do konzole není povolen");
    expect(workspacePage).toContain("Konzoli můžeš použít až po přiřazení k aktivnímu týmu.");
  });

  it("hides console actions while loading or after a load error", () => {
    expect(workspacePage).toContain("actions={isLoading || loadError ? null : operatorNextActionPanel}");
  });

  it("checks the current assignment before changing operator presence or claiming a lead", () => {
    const loadDataStart = workspacePage.indexOf("async function loadData()");
    const operatorBranchStart = workspacePage.indexOf('if (identity.role === "operator")', loadDataStart);
    const operatorBranchEnd = workspacePage.indexOf("const [fetchedLeads", operatorBranchStart);
    const operatorBranch = workspacePage.slice(operatorBranchStart, operatorBranchEnd);

    expect(operatorBranch).toContain("let currentAssignment = await getCurrentLeadAction()");
    expect(operatorBranch).toContain("if (!currentAssignment)");
    expect(operatorBranch.indexOf("getCurrentLeadAction()")).toBeLessThan(operatorBranch.indexOf("setOperatorPresenceAction"));
    expect(operatorBranch.indexOf("setOperatorPresenceAction")).toBeLessThan(operatorBranch.indexOf("claimNextLeadAction"));
  });
});
