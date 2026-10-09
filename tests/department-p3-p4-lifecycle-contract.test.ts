import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009120000_p4_next_day_and_p3_retention.sql"),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("Department P3 Retention & Department P4 Rescue migration contract", () => {
  it("provisions the P3 department team for all workspaces", () => {
    expect(migration).toContain("INSERT INTO public.teams");
    expect(migration).toContain("'Oddělení P3 (Retence)'");
    expect(migration).toContain("'p3'");
  });

  it("adds package arrival and pickup call tracking columns to orders table", () => {
    expect(normalizedMigration).toContain("ADD COLUMN IF NOT EXISTS package_arrived_at TIMESTAMPTZ");
    expect(normalizedMigration).toContain("ADD COLUMN IF NOT EXISTS pickup_call_completed_at TIMESTAMPTZ");
  });

  it("enforces 24-hour (next day) cooldown for recyclable objections routing to P4", () => {
    expect(normalizedMigration).toContain("cooldown_interval INTERVAL := INTERVAL '24 hours'");
    expect(normalizedMigration).toContain("team_id = COALESCE(p4_team_id, current_team_id)");
    expect(normalizedMigration).toContain("'p4_recycled', true");
  });

  it("routes delivered packages to P3 retention queue after 21 days from delivery", () => {
    expect(normalizedMigration).toContain("NEW.status = 'delivered'");
    expect(normalizedMigration).toContain("available_at = delivery_time + INTERVAL '21 days'");
    expect(normalizedMigration).toContain("team_id = p3_team_id");
    expect(normalizedMigration).toContain("'p3_retention', true");
  });

  it("routes returned orders immediately to P4 for Re-ship contact", () => {
    expect(normalizedMigration).toContain("NEW.status = 'returned'");
    expect(normalizedMigration).toContain("team_id = p4_team_id");
    expect(normalizedMigration).toContain("available_at = clock_timestamp()");
    expect(normalizedMigration).toContain("'p4_returned', true");
  });

  it("routes at-risk packages at pickup locations (> 3 days, not yet called) to P4", () => {
    expect(normalizedMigration).toContain("NEW.status = 'sent' AND NEW.package_location IS NOT NULL");
    expect(normalizedMigration).toContain("NEW.pickup_call_completed_at IS NULL");
    expect(normalizedMigration).toContain("available_at = COALESCE(NEW.package_arrived_at, clock_timestamp()) + INTERVAL '3 days'");
    expect(normalizedMigration).toContain("team_id = p4_team_id");
  });
});
