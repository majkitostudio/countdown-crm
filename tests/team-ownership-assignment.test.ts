import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  __dirname,
  "../supabase/migrations/20260914004710_team_ownership_assignment.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");

const indexMigrationPath = path.resolve(
  __dirname,
  "../supabase/migrations/20260914005014_team_ownership_fk_indexes.sql",
);
const indexMigration = fs.readFileSync(indexMigrationPath, "utf8");

describe("team ownership assignment", () => {
  it("keeps ownership changes administrator-only and workspace-scoped", () => {
    expect(migration).toContain("private.is_workspace_admin(resource_workspace_id)");
    expect(migration).toContain("Team must belong to the same workspace");
    expect(migration).toContain("Only active teams can receive ownership");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.assign_team_ownership");
  });

  it("changes only team ownership and preserves queue state and operator", () => {
    expect(migration).toContain("SET team_id = target_team_id, updated_at = NOW()");
    expect(migration).not.toContain("SET state =");
    expect(migration).not.toContain("SET assigned_operator_id =");
    expect(migration).toContain("queue_item.state, queue_item.assigned_operator_id");
  });

  it("records queue ownership changes as explicit history events and audit logs", () => {
    expect(migration).toContain("'team_assigned'");
    expect(migration).toContain("previous_team_id");
    expect(migration).toContain("'SETTINGS_CHANGE'");
    expect(migration).toContain("public.audit_logs");
  });

  it("covers composite ownership foreign keys with matching indexes", () => {
    expect(indexMigration).toContain("team_memberships_team_workspace_fk_idx");
    expect(indexMigration).toContain("leads_team_workspace_fk_idx");
    expect(indexMigration).toContain("lead_queue_items_team_workspace_fk_idx");
    expect(indexMigration).toContain("calls_team_workspace_fk_idx");
    expect(indexMigration).toContain("orders_team_workspace_fk_idx");
  });
});
