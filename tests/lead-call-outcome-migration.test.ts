import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260901143000_allow_outcome_completion_after_call_end.sql",
  ),
  "utf8",
);

describe("post-call outcome completion migration", () => {
  it("accepts both an active call and a persisted awaiting-outcome assignment", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.complete_lead_call_with_order_items");
    expect(migration).toContain("AND queue_item.state IN ('in_progress', 'awaiting_outcome');");
    expect(migration).toContain("completion := private.complete_lead_call_impl(");
    expect(migration).not.toContain("AND queue_item.state = 'in_progress';");
  });
});
