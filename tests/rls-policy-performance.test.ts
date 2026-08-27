import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260827013900_rls_policy_performance_hardening.sql", import.meta.url),
  "utf8",
);

describe("RLS policy performance hardening", () => {
  it("replaces overlapping manager/member ALL policies with explicit operations", () => {
    for (const table of ["products", "objections", "record_entities", "record_values", "workflows", "user_gamification"]) {
      expect(migration).toContain(`DROP POLICY IF EXISTS`);
      expect(migration).toContain(`public.${table}`);
    }
    expect(migration).not.toContain(" FOR ALL ");
    expect(migration).toContain("FOR INSERT TO authenticated");
    expect(migration).toContain("FOR UPDATE TO authenticated");
    expect(migration).toContain("FOR DELETE TO authenticated");
  });

  it("keeps workspace and ownership predicates in place", () => {
    expect(migration).toContain("private.is_workspace_manager_or_admin(workspace_id)");
    expect(migration).toContain("private.is_workspace_member(workspace_id)");
    expect(migration).toContain("(SELECT auth.uid()) = user_id");
    expect(migration).toContain("p.workspace_id = objections.workspace_id");
    expect(migration).toContain("e.workspace_id = record_values.workspace_id");
  });
});
