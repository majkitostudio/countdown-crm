import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20261116120000_reject_missing_product_currency_order_writes.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

describe("order product currency transaction guard", () => {
  it("rejects missing or blank product currencies in both database triggers", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.sync_order_currency_from_product()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.enforce_order_item_currency_match()");
    expect(migration).toContain("IF product_currency IS NULL THEN RAISE EXCEPTION 'Order product currency is required'");
    expect(migration).toContain("IF product_currency IS NULL THEN RAISE EXCEPTION 'Order item product currency is required'");
    expect(migration).toContain("NULLIF(upper(btrim(product.currency)), '')");
    expect(migration).not.toMatch(/coalesce\s*\(\s*product\.currency\s*,\s*'USD'\s*\)/i);
  });

  it("locks product rows while validating currency and retains only trigger execution", () => {
    expect(migration.match(/FOR SHARE/g)).toHaveLength(2);
    expect(migration).toContain("REVOKE ALL ON FUNCTION private.sync_order_currency_from_product()");
    expect(migration).toContain("REVOKE ALL ON FUNCTION private.enforce_order_item_currency_match()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.");
  });
});
