import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OperatorNextActionPanel } from "@/components/workspace/OperatorNextActionPanel";

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
    expect(nextActionPanel).toContain("Ready to call");
    expect(nextActionPanel).toContain("flex w-full min-w-0 flex-col items-stretch");
    expect(nextActionPanel).not.toContain("grid gap-4 xl:grid-cols");
  });

  it("keeps compact action surfaces padded after Surface class filtering", () => {
    const markup = renderToStaticMarkup(
      createElement(OperatorNextActionPanel, {
        state: "waiting_assignment",
        leadName: null,
        callbacks: [],
        isCallbacksLoading: false,
        callbackError: null,
        isAssignmentRefreshing: false,
        onPrimaryAction: () => undefined,
        onRefreshCallbacks: () => undefined,
      }),
    );

    expect(markup).toContain("flex min-w-0 flex-wrap items-center gap-2 px-3 py-2");
    expect(markup).toContain("flex items-center gap-2 px-3 py-2");
  });

  it("stacks the action surfaces inside the available mobile width", () => {
    const source = readFileSync(
      path.join(projectRoot, "src", "components", "workspace", "OperatorNextActionPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("flex w-full min-w-0 flex-col items-stretch");
    expect(source).toContain("sm:flex-row");
  });
});
