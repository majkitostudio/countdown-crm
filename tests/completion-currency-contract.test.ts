import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260902090000_completion_audit_and_currency_contract.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const currencyHardeningMigration = readFileSync(
  new URL("../supabase/migrations/20260902150000_harden_order_currency_updates.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

describe("call completion audit and currency contract", () => {
  it("audits calls and call-created orders in database triggers", () => {
    expect(migration).toContain("CREATE TRIGGER calls_audit_insert AFTER INSERT ON public.calls");
    expect(migration).toContain("'CALL_COMPLETED'");
    expect(migration).toContain("CREATE TRIGGER orders_call_audit_insert AFTER INSERT ON public.orders");
    expect(migration).toContain("'ORDER_CREATED_FROM_CALL'");
    expect(migration).toContain("INSERT INTO public.audit_logs");
  });

  it("keeps order and item currencies aligned without implicit conversion", () => {
    expect(migration).toContain("CREATE TRIGGER orders_sync_currency_from_product BEFORE INSERT OR UPDATE OF product_id ON public.orders");
    expect(migration).toContain("CREATE TRIGGER order_items_enforce_currency BEFORE INSERT OR UPDATE OF order_id, workspace_id, currency ON public.order_items");
    expect(migration).toContain("All order items must use the order currency");
    expect(migration).toContain("Order product currency cannot change after creation");
    expect(migration).not.toContain("exchange");
    expect(currencyHardeningMigration).toContain("UPDATE OF product_id, currency");
    expect(currencyHardeningMigration).toContain("Order currency must match the product currency");
  });
});
