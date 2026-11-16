import { describe, expect, it } from "vitest";
import { getCrossSellRecommendations } from "@/lib/recommendations";
import type { Product } from "@/lib/products";

function product(overrides: Partial<Product> & Pick<Product, "id">): Product {
  return {
    title: overrides.title ?? overrides.id,
    category: overrides.category ?? "supplements",
    price: overrides.price ?? 100,
    currency: overrides.currency ?? "CZK",
    description: "",
    image_url: "",
    in_stock: true,
    created_at: "2026-11-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("cross-sell currency matching", () => {
  it("treats a missing legacy currency as CZK without mixing products in other currencies", () => {
    const primary = product({ id: "primary", currency: "" });
    const sameCurrency = product({ id: "same", currency: "" });
    const otherCurrency = product({ id: "foreign", currency: "EUR" });

    const recommendations = getCrossSellRecommendations(primary, [primary, sameCurrency, otherCurrency]);

    expect(recommendations.map(({ recommendedProduct }) => recommendedProduct.id)).toEqual(["same"]);
  });
});
