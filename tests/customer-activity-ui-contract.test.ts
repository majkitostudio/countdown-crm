import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("Customer activity UI contract", () => {
  it("renders only sources provided by the read model", () => {
    const timeline = readFileSync(
      path.join(projectRoot, "src", "components", "workspace", "CustomerTimelineCard.tsx"),
      "utf8",
    );

    expect(timeline).toContain("getLeadActivityPage");
    expect(timeline).toContain('key: "lead_note"');
    expect(timeline).not.toContain("sms_paylink");
    expect(timeline).not.toContain("status_change");
    expect(timeline).toContain("Load more activity");
  });

  it("keeps the lead activity reader behind workspace and lead authorization", () => {
    const activityDal = readFileSync(
      path.join(projectRoot, "src", "lib", "dal", "activity.ts"),
      "utf8",
    );

    expect(activityDal).toContain("requireWorkspaceContext(requestedWorkspaceId)");
    expect(activityDal).toContain("getScopedLeadForWorkspace(leadId, context.workspaceId)");
    expect(activityDal).toContain('.eq("workspace_id", workspaceId)');
    expect(activityDal).toContain('.eq("lead_id", leadId)');
  });
});
