import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../supabase/migrations/20260904120000_sync_wallet_function_permissions.sql",
  import.meta.url,
);

describe("wallet function permission synchronization", () => {
  it("restores manager/admin authorization for wallet configuration functions", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, "utf8").replace(/\s+/g, " ");

    expect(migration.match(/private\.is_workspace_manager_or_admin\(p_workspace_id\)/g)).toHaveLength(2);
    expect(migration).not.toContain("private.is_workspace_admin(p_workspace_id)");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_wallet_settings");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.add_wallet_bonus_rule");
  });
});
