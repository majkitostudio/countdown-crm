import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260914202000_operator_scheduled_callback_visibility.sql"),
  "utf8",
);

describe("operator scheduled callback visibility contract", () => {
  it("allows only the current operator to read their waiting callbacks", () => {
    expect(migration).toContain("preferred_operator_id = (SELECT auth.uid())");
    expect(migration).toContain("state = 'waiting_callback'");
    expect(migration).toContain("private.is_team_member(team_id)");
    expect(migration).toContain("private.is_workspace_member(workspace_id)");
  });

  it("keeps active queue visibility and does not add write policies", () => {
    expect(migration).toContain("state IN ('assigned', 'in_progress', 'awaiting_outcome')");
    expect(migration).not.toContain("FOR INSERT");
    expect(migration).not.toContain("FOR UPDATE");
    expect(migration).not.toContain("FOR DELETE");
  });
});
