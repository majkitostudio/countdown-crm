import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("operator next action UI contract", () => {
  it("uses a callback-only data path instead of depending on personal reminders", () => {
    const calendarActions = readFileSync(path.join(projectRoot, "src", "app", "actions", "calendar.ts"), "utf8");

    expect(calendarActions).toContain("listScheduledCallbacksForWorkspace");
    expect(calendarActions).toContain("listScheduledCallbacksAction");
  });

  it("keeps the next action and callback inbox in the operator workspace", () => {
    const workspacePage = readFileSync(path.join(projectRoot, "src", "app", "workspace", "page.tsx"), "utf8");
    const nextActionPanel = readFileSync(path.join(projectRoot, "src", "components", "workspace", "OperatorNextActionPanel.tsx"), "utf8");

    expect(workspacePage).toContain("OperatorNextActionPanel");
    expect(workspacePage).toContain("listScheduledCallbacksAction");
    expect(nextActionPanel).toContain('data-testid="operator-next-action"');
    expect(nextActionPanel).toContain('data-testid="callback-recovery-inbox"');
    expect(nextActionPanel).toContain("No callable contact is currently assigned");
  });
});
