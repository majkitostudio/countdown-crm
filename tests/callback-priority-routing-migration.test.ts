import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261007160000_scheduled_instant_fallback_routing.sql"),
  "utf8",
);
const normalized = migration.replace(/\s+/g, " ");

describe("Scheduled callback priority routing migration contract", () => {
  it("implements priority routing back to original operator with preferred_operator_id", () => {
    expect(normalized).toContain("WHEN queue_item.state = 'waiting_callback' AND queue_item.preferred_operator_id = current_user_id THEN 0");
    expect(normalized).toContain("WHEN queue_item.preferred_operator_id = current_user_id THEN 1");
  });

  it("permits instant team fallback when scheduled time arrives without a 15-minute penalty", () => {
    expect(normalized).toContain("WHEN queue_item.state = 'waiting_callback' THEN 2");
    expect(normalized).toContain("queue_item.team_id = operator_team_id");
    expect(normalized).toContain("queue_item.scheduled_at <= NOW()");
    expect(normalized).not.toContain("INTERVAL '15 minutes'");
  });
});
