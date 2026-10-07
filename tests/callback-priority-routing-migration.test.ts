import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261007153000_scheduled_callback_priority_routing.sql"),
  "utf8",
);
const normalized = migration.replace(/\s+/g, " ");

describe("Scheduled callback priority routing migration contract", () => {
  it("implements priority routing back to original operator with preferred_operator_id", () => {
    expect(normalized).toContain("queue_item.preferred_operator_id = current_user_id");
    expect(normalized).toContain("WHEN queue_item.state = 'waiting_callback' AND queue_item.preferred_operator_id = current_user_id THEN 0");
  });

  it("permits fallback only when preferred operator is unavailable, busy, or callback is overdue", () => {
    expect(normalized).toContain("NOT EXISTS ( SELECT 1 FROM public.operator_presence");
    expect(normalized).toContain("OR EXISTS ( SELECT 1 FROM public.lead_queue_items AS preferred_assignment");
    expect(normalized).toContain("queue_item.scheduled_at < NOW() - INTERVAL '15 minutes'");
  });
});
