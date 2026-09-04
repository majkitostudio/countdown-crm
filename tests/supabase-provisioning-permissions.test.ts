import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../supabase/migrations/20260905090000_grant_service_role_membership_provisioning.sql",
  import.meta.url,
);

describe("trusted Team Leader provisioning permissions", () => {
  it("gives only the trusted service role the membership operations used by provisioning", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, "utf8").replace(/\s+/g, " ");

    expect(migration).toContain(
      "GRANT SELECT, INSERT, DELETE ON TABLE public.workspace_members TO service_role",
    );
    expect(migration).not.toContain("TO anon");
    expect(migration).not.toContain("TO authenticated");
  });
});
