import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  __dirname,
  "../supabase/migrations/20260914124110_team_scope_enforcement.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");
const cleanupMigration = fs.readFileSync(
  path.resolve(__dirname, "../supabase/migrations/20260914124233_team_scope_policy_cleanup.sql"),
  "utf8",
);

describe("team scope enforcement", () => {
  it("requires an active team before an operator can use queue work", () => {
    expect(migration).toContain("private.current_operator_team_id");
    expect(migration).toContain("Operator is not assigned to an active team; contact an Administrator");
    expect(migration).toContain("queue_item.team_id = operator_team_id");
  });

  it("does not expose unassigned data to Team Leaders", () => {
    expect(migration).toContain("team_id IS NOT NULL AND private.is_team_leader(team_id)");
    expect(migration).toContain("private.can_manage_team_resource(workspace_id, team_id)");
    expect(migration).toContain("NULL team ownership is Administrator-only setup work");
  });

  it("keeps queue management and reassignment inside the team", () => {
    expect(migration).toContain("private.can_manage_team_resource(queue_item.workspace_id, queue_item.team_id)");
    expect(migration).toContain("Target Operator must belong to the same team as the queue item");
    expect(migration).toContain("Assigned Operator must belong to the queue item team");
  });

  it("keeps team snapshots on queue events", () => {
    expect(migration).toContain("workspace_id, team_id, queue_item_id, lead_id, event_type");
    expect(migration).toContain("queue_item.workspace_id, queue_item.team_id, queue_item.id, queue_item.lead_id");
  });

  it("removes the historical workspace-wide queue exception", () => {
    expect(cleanupMigration).toContain("Workspace members can view permitted queue items");
    expect(cleanupMigration).toContain("Workspace members can view permitted operator presence");
    expect(cleanupMigration).toContain("CREATE POLICY \"Operators can view own presence\"");
  });
});
