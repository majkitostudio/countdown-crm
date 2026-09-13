import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  __dirname,
  "../supabase/migrations/20260913215733_allow_operator_notes_for_current_assignment.sql",
);

describe("operator lead-note RLS migration", () => {
  it("allows an operator note only for the current assigned queue item", () => {
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(migration).toContain('DROP POLICY IF EXISTS "Workspace members can create lead notes"');
    expect(migration).toContain("private.is_workspace_manager_or_admin(target_workspace_id)");
    expect(migration).toContain("FROM public.lead_queue_items AS queue_item");
    expect(migration).toContain("queue_item.assigned_operator_id = (SELECT auth.uid())");
    expect(migration).toContain("queue_item.state IN ('assigned', 'in_progress', 'awaiting_outcome')");
  });
});
