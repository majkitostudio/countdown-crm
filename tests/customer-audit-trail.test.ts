import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("customer Git-style audit trail contract", () => {
  it("loads lead audit events through the manager-only server path", () => {
    const action = readFileSync(path.join(projectRoot, "src", "app", "actions", "audit.ts"), "utf8");
    const dal = readFileSync(path.join(projectRoot, "src", "lib", "dal", "audit.ts"), "utf8");
    const timeline = readFileSync(path.join(projectRoot, "src", "lib", "timeline.ts"), "utf8");

    expect(action).toContain("listLeadAuditLogsAction");
    expect(dal).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
    expect(dal).toContain('.eq("target_resource", "Lead")');
    expect(dal).toContain('.ilike("details", `%${leadId}%`)');
    expect(timeline).toContain("options.includeAudit ? listLeadAuditLogsAction(leadId)");
    expect(timeline).toContain('type: "status_change" as const');
  });

  it("renders the lead history as an attributed Git-style event stream", () => {
    const drawer = readFileSync(path.join(projectRoot, "src", "components", "leads", "LeadDetailDrawer.tsx"), "utf8");

    expect(drawer).toContain('data-testid="lead-git-audit-trail"');
    expect(drawer).toContain('data-testid="lead-audit-event"');
    expect(drawer).toContain("Customer Activity & Change History");
    expect(drawer).toContain("Committed by:");
    expect(drawer).toContain("ref:{act.id.slice(-8)}");
    expect(drawer).toContain("getLeadActivities(lead.id, { includeAudit: true })");
  });
});
