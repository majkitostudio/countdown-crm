import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("workflow server-boundary UI contract", () => {
  it("does not dispatch production workflow events from browser state", () => {
    const workspacePage = readFileSync(path.join(projectRoot, "src", "app", "workspace", "page.tsx"), "utf8");
    expect(workspacePage).not.toContain("workflowEngine.emit");
    expect(workspacePage).toContain("completion.workflowDispatches");
  });

  it("labels the manual workflow action as test-only simulation", () => {
    const workflowsClient = readFileSync(path.join(projectRoot, "src", "app", "workflows", "WorkflowsManagementClient.tsx"), "utf8");
    expect(workflowsClient).toContain("Test-only simulation: Call Ended");
    expect(workflowsClient).toContain("TEST_ONLY_CALL");
    expect(workflowsClient).not.toContain("Demo test transcript");
  });

  it("guards the management route before rendering its client controls", () => {
    const workflowsPage = readFileSync(path.join(projectRoot, "src", "app", "workflows", "page.tsx"), "utf8");
    expect(workflowsPage).not.toContain('"use client"');
    expect(workflowsPage).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
    expect(workflowsPage).toContain("Workflow rules and execution data are available to Team Leaders and Administrators only.");
    expect(workflowsPage).toContain("return <WorkflowsManagementClient />");
  });

  it("awaits execution persistence instead of swallowing a rejected write", () => {
    const engine = readFileSync(path.join(projectRoot, "src", "lib", "workflows", "engine.ts"), "utf8");
    expect(engine).toContain("persist: (entry) => createWorkflowExecutionAction(entry)");
    expect(engine).not.toContain("createWorkflowExecutionAction(entry).catch");
  });

  it("bounds Operator call start and keeps late server recovery explicit", () => {
    const workspacePage = readFileSync(path.join(projectRoot, "src", "app", "workspace", "page.tsx"), "utf8");
    expect(workspacePage).toContain("withTimeout(\n              startRequest");
    expect(workspacePage).toContain("withTimeout(\n              softphoneController.dial");
    expect(workspacePage).toContain("abortLeadCallStartAction(activeQueueItemId, \"Server call start timed out\")");
    expect(workspacePage).toContain("Call start recovery is still in progress");
  });
});
