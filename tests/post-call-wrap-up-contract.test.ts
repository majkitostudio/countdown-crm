import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260904104023_post_call_fail_details.sql"),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("post-call fail persistence contract", () => {
  it("stores fail reason and operator note as separate call fields", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS fail_reason TEXT");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS operator_note TEXT");
    expect(normalizedMigration).toContain("CHECK ( fail_reason IS NULL OR fail_reason IN (");
  });

  it("exposes a completion RPC that accepts the new fields", () => {
    expect(migration).toContain("call_note TEXT");
    expect(migration).toContain("call_fail_reason TEXT");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("queue_item.state = 'awaiting_outcome'");
    expect(normalizedMigration).toContain("operator_note = NULLIF(btrim(call_note), '')");
    expect(migration).toContain("fail_reason = call_fail_reason");
  });

  it("rejects a fail without both required details in SQL", () => {
    expect(migration).toContain("Fail outcomes require a fail reason");
    expect(migration).toContain("Fail outcomes require an operator note");
  });
});
