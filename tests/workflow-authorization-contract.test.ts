import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";

const projectRoot = path.resolve(__dirname, "..");

describe("workflow authorization contract", () => {
  it("allows management only to Team Leaders and Administrators", () => {
    expect(isTeamLeaderOrAdministrator("operator")).toBe(false);
    expect(isTeamLeaderOrAdministrator("team_leader")).toBe(true);
    expect(isTeamLeaderOrAdministrator("administrator")).toBe(true);
  });

  it("guards every workflow management Server Action", () => {
    const actions = readFileSync(path.join(projectRoot, "src", "app", "actions", "workflows.ts"), "utf8");
    expect(actions).toContain("async function requireWorkflowManagementAccess");
    for (const action of [
      "listWorkflowsAction",
      "saveWorkflowAction",
      "deleteWorkflowAction",
      "listWorkflowExecutionsAction",
      "createWorkflowExecutionAction",
      "simulateWorkflowEventAction",
    ]) {
      const start = actions.indexOf(`export async function ${action}`);
      expect(start, `${action} should exist`).toBeGreaterThanOrEqual(0);
      const nextExport = actions.indexOf("export async function", start + 1);
      const body = actions.slice(start, nextExport === -1 ? undefined : nextExport);
      expect(body).toContain("await requireWorkflowManagementAccess()");
    }
  });

  it("keeps dispatch reads/inserts member-scoped and separate from management reads", () => {
    const dal = readFileSync(path.join(projectRoot, "src", "lib", "dal", "workflows.ts"), "utf8");
    const dispatcher = readFileSync(path.join(projectRoot, "src", "lib", "workflows", "dispatcher.ts"), "utf8");
    const completion = readFileSync(path.join(projectRoot, "src", "lib", "dal", "callCompletion.ts"), "utf8");

    expect(dal).toContain("listWorkflowRulesForDispatchForWorkspace");
    expect(dal).toContain("createWorkflowExecutionForDispatchForWorkspace");
    expect(dispatcher).toContain("listWorkflowRulesForDispatchForWorkspace");
    expect(dispatcher).toContain("createWorkflowExecutionForDispatchForWorkspace");
    expect(dispatcher).toContain('SERVER_SUPPORTED_TRIGGERS: TriggerType[] = ["on_call_ended"]');
    expect(completion).toContain("dispatchWorkflowEventForWorkspace");
    expect(completion).toContain('trigger: "on_call_ended"');
  });
});
