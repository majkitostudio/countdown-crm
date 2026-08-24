import { describe, expect, it } from "vitest";
import { buildCallOrderItems, totalCallOrderItems } from "@/lib/callOrder";

describe("call checkout order items", () => {
  it("preserves quantity and bundle pricing in the server payload", () => {
    const items = buildCallOrderItems({
      product_id: "primary",
      unit_price: 100,
      quantity: 2,
      discount_percent: 10,
      bundle: { product_id: "bundle", unit_price: 50 },
    });

    expect(items).toEqual([
      { product_id: "primary", quantity: 2, unit_price: 90 },
      { product_id: "bundle", quantity: 1, unit_price: 45 },
    ]);
    expect(totalCallOrderItems(items)).toBe(225);
  });

  it("rounds each item price before calculating the total", () => {
    const items = buildCallOrderItems({
      product_id: "primary",
      unit_price: 19.999,
      quantity: 3,
      discount_percent: 0,
    });

    expect(items[0]?.unit_price).toBe(20);
    expect(totalCallOrderItems(items)).toBe(60);
  });
});
