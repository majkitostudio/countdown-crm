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
    const workflowsPage = readFileSync(path.join(projectRoot, "src", "app", "workflows", "page.tsx"), "utf8");
    expect(workflowsPage).toContain("Test-only simulation: Call Ended");
    expect(workflowsPage).toContain("TEST_ONLY_CALL");
    expect(workflowsPage).not.toContain("Demo test transcript");
  });

  it("awaits execution persistence instead of swallowing a rejected write", () => {
    const engine = readFileSync(path.join(projectRoot, "src", "lib", "workflows", "engine.ts"), "utf8");
    expect(engine).toContain("persist: (entry) => createWorkflowExecutionAction(entry)");
    expect(engine).not.toContain("createWorkflowExecutionAction(entry).catch");
  });
});
