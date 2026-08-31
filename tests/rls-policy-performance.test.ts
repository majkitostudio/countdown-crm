import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260830205207_rls_policy_performance_hardening.sql", import.meta.url),
  "utf8",
);
const compactMigration = migration.replace(/\s+/g, " ");

const policyGroups = [
  {
    table: "products",
    oldPolicies: ["Workspace managers can manage products", "Team Leaders and Administrators can manage products"],
    newPolicies: [
      "Team Leaders and Administrators can insert products",
      "Team Leaders and Administrators can update products",
      "Team Leaders and Administrators can delete products",
    ],
    predicate: "private.is_workspace_manager_or_admin(workspace_id)",
  },
  {
    table: "objections",
    oldPolicies: ["Workspace managers can manage objections", "Team Leaders and Administrators can manage objections"],
    newPolicies: [
      "Team Leaders and Administrators can insert objections",
      "Team Leaders and Administrators can update objections",
      "Team Leaders and Administrators can delete objections",
    ],
    predicate: "private.is_workspace_manager_or_admin(workspace_id)",
  },
  {
    table: "record_entities",
    oldPolicies: ["Workspace members can manage record entities"],
    newPolicies: [
      "Workspace members can insert record entities",
      "Workspace members can update record entities",
      "Workspace members can delete record entities",
    ],
    predicate: "private.is_workspace_member(workspace_id)",
  },
  {
    table: "record_values",
    oldPolicies: ["Workspace members can manage record values"],
    newPolicies: [
      "Workspace members can insert record values",
      "Workspace members can update record values",
      "Workspace members can delete record values",
    ],
    predicate: "private.is_workspace_member(workspace_id)",
  },
  {
    table: "workflows",
    oldPolicies: ["Workspace managers can manage workflows", "Team Leaders and Administrators can manage workflows"],
    newPolicies: [
      "Team Leaders and Administrators can insert workflows",
      "Team Leaders and Administrators can update workflows",
      "Team Leaders and Administrators can delete workflows",
    ],
    predicate: "private.is_workspace_manager_or_admin(workspace_id)",
  },
  {
    table: "user_gamification",
    oldPolicies: ["Users can manage own gamification"],
    newPolicies: ["Users can insert own gamification", "Users can update own gamification", "Users can delete own gamification"],
    predicate: "(SELECT auth.uid()) = user_id",
  },
] as const;

describe("RLS policy performance hardening", () => {
  it("replaces the intended policy on every table with one policy per mutation", () => {
    for (const group of policyGroups) {
      for (const oldPolicy of group.oldPolicies) {
        expect(compactMigration).toContain(`DROP POLICY IF EXISTS "${oldPolicy}" ON public.${group.table}`);
      }
      for (const [index, newPolicy] of group.newPolicies.entries()) {
        const operation = ["INSERT", "UPDATE", "DELETE"][index];
        expect(compactMigration).toContain(`CREATE POLICY "${newPolicy}" ON public.${group.table} FOR ${operation} TO authenticated`);
      }
      expect(compactMigration).toContain(group.predicate);
    }
    expect(compactMigration).not.toContain(" FOR ALL ");
  });

  it("keeps cross-row workspace predicates and update checks in place", () => {
    expect(compactMigration).toContain("p.workspace_id = objections.workspace_id");
    expect(compactMigration).toContain("o.workspace_id = record_entities.workspace_id");
    expect(compactMigration).toContain("e.workspace_id = record_values.workspace_id");
    expect(compactMigration).toContain(
      "CREATE POLICY \"Team Leaders and Administrators can update objections\" ON public.objections FOR UPDATE TO authenticated USING (private.is_workspace_manager_or_admin(workspace_id)",
    );
    expect(compactMigration).toContain(
      "CREATE POLICY \"Workspace members can update record values\" ON public.record_values FOR UPDATE TO authenticated USING (private.is_workspace_member(workspace_id)",
    );
    expect(compactMigration).toContain("WITH CHECK (private.is_workspace_manager_or_admin(workspace_id)");
    expect(compactMigration).toContain("WITH CHECK (private.is_workspace_member(workspace_id)");
    expect(compactMigration).toContain("WITH CHECK ((SELECT auth.uid()) = user_id)");
  });
});
