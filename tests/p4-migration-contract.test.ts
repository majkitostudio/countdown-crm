import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261007140000_p4_queue_recycling.sql"),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("P4 queue recycling database migration contract", () => {
  it("provisions the P4 department team", () => {
    expect(migration).toContain("INSERT INTO public.teams");
    expect(migration).toContain("'Oddělení P4'");
    expect(migration).toContain("'p4'");
  });

  it("implements fail outcome recycling with cooling-off intervals", () => {
    expect(normalizedMigration).toContain("call_fail_reason IN ('needs_time', 'price', 'distrust', 'alternative_solution', 'other')");
    expect(migration).toContain("INTERVAL '3 days'");
    expect(migration).toContain("INTERVAL '14 days'");
    expect(migration).toContain("INTERVAL '21 days'");
    expect(migration).toContain("INTERVAL '30 days'");
  });

  it("routes recycled queue items to P4 with cleared operator affinity and P4 priority", () => {
    expect(normalizedMigration).toContain("state = 'available'");
    expect(normalizedMigration).toContain("team_id = COALESCE(p4_team_id, current_team_id)");
    expect(normalizedMigration).toContain("priority = -4");
    expect(normalizedMigration).toContain("preferred_operator_id = NULL");
    expect(normalizedMigration).toContain("assigned_operator_id = NULL");
    expect(normalizedMigration).toContain("status = 'contacted'");
    expect(normalizedMigration).toContain("'p4_recycled', true");
  });
});
