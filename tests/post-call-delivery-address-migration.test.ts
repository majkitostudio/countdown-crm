import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("post-call delivery address migration", () => {
  it("writes the function parameter explicitly instead of the orders column", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260913204833_fix_post_call_delivery_address_snapshot.sql"),
      "utf8",
    );

    expect(sql).toContain("#variable_conflict use_variable");
    expect(sql).toContain("SET delivery_address_snapshot = delivery_address_snapshot");
  });
});
