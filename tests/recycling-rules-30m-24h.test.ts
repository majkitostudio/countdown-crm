import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261007150000_recycling_rules_30m_24h.sql"),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("Automatic recycling rules contract (30m no_answer & 24h P4 unsuccessful_sale)", () => {
  it("implements 30 minutes requeue interval for no_answer outcome", () => {
    expect(normalizedMigration).toContain("ELSIF call_outcome = 'no_answer' THEN");
    expect(normalizedMigration).toContain("next_callback_at := NOW() + INTERVAL '30 minutes';");
    expect(normalizedMigration).toContain("next_queue_state := 'available';");
  });

  it("routes unsuccessful_sale objections to P4 department after 24 hours", () => {
    expect(normalizedMigration).toContain("WHEN 'unsuccessful_sale' THEN INTERVAL '24 hours'");
    expect(normalizedMigration).toContain("team_id = COALESCE(p4_team_id, current_team_id)");
    expect(normalizedMigration).toContain("priority = -4");
    expect(normalizedMigration).toContain("preferred_operator_id = NULL");
    expect(normalizedMigration).toContain("'p4_recycled', true");
  });
});
