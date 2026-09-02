import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("floating call controller contract", () => {
  it("mounts in the persistent app shell", () => {
    const appShell = readFileSync(join(projectRoot, "src/components/layout/AppShell.tsx"), "utf8");

    expect(appShell).toContain("<CallControllerProvider>");
    expect(appShell).toContain("<FloatingCallController />");
  });

  it("keeps one active-call control surface in the lead header", () => {
    const header = readFileSync(join(projectRoot, "src/components/workspace/OperatorLeadHeader.tsx"), "utf8");
    const controller = readFileSync(join(projectRoot, "src/components/layout/FloatingCallController.tsx"), "utf8");

    expect(header).toContain("Controls are floating above the workspace");
    expect(header).not.toContain('aria-label="End call"');
    expect(controller).toContain('data-testid="floating-call-controller"');
    expect(controller).toContain("toggleHold");
    expect(controller).toContain("toggleMute");
  });

  it("preserves workspace call actions through provider registration", () => {
    const workspace = readFileSync(join(projectRoot, "src/app/workspace/page.tsx"), "utf8");
    const provider = readFileSync(join(projectRoot, "src/components/layout/CallControllerProvider.tsx"), "utf8");

    expect(workspace).toContain("registerCallContext({");
    expect(workspace).toContain("onToggleCall: () => handleToggleCallRef.current()");
    expect(provider).toContain("toggleCallRef");
    expect(workspace).not.toContain("Operator workspace unmounted during call start");
  });
});
