import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const readProjectFile = (...segments: string[]) => readFileSync(path.join(projectRoot, ...segments), "utf8");

describe("floating call controller wiring", () => {
  it("keeps softphone and server assignment state in one persistent provider", () => {
    const provider = readProjectFile("src", "components", "layout", "CallSessionProvider.tsx");
    const shell = readProjectFile("src", "components", "layout", "AppShell.tsx");

    expect(provider).toContain("softphoneController.subscribeState");
    expect(provider).toContain("endLeadCallAction");
    expect(provider).toContain("heartbeatLeadAssignmentAction");
    expect(shell).toContain("<CallSessionProvider>");
    expect(shell).toContain("<FloatingCallController />");
  });

  it("mounts a portal controller with truthful active-call actions", () => {
    const controller = readProjectFile("src", "components", "workspace", "FloatingCallController.tsx");
    const header = readProjectFile("src", "components", "workspace", "OperatorLeadHeader.tsx");
    const workspace = readProjectFile("src", "app", "workspace", "page.tsx");

    expect(controller).toContain("createPortal(controller, document.body)");
    expect(controller).toContain('data-testid="floating-call-controller"');
    expect(controller).toContain("Put call on hold");
    expect(controller).toContain("End call");
    expect(header).not.toContain("PhoneOff");
    expect(header).not.toContain("onToggleMute");
    expect(workspace).toContain("useCallSession");
  });
});
