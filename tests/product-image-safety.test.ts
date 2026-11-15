import { describe, expect, it } from "vitest";
import { resolveProductImageSource } from "../src/lib/productImageSafety";

describe("product image assignment safety", () => {
  it("uses the neutral fallback when one image is shared across categories", () => {
    const catalog = [
      { id: "product-a", category: "electronics", image_url: "https://example.test/shared.jpg" },
      { id: "product-b", category: "cosmetics", image_url: "https://example.test/shared.jpg" },
      { id: "product-c", category: "supplements", image_url: "https://example.test/shared.jpg" },
    ];

    for (const product of catalog) {
      expect(resolveProductImageSource(product, catalog)).toBeNull();
    }
  });

  it("keeps an image assigned to products in the same category", () => {
    const catalog = [
      { id: "product-a", category: "cosmetics", image_url: " https://example.test/shared.jpg " },
      { id: "product-b", category: "cosmetics", image_url: "https://example.test/shared.jpg" },
    ];

    expect(resolveProductImageSource(catalog[0], catalog)).toBe("https://example.test/shared.jpg");
  });

  it("uses the neutral fallback when an image is missing", () => {
    const product = { id: "product-a", category: "supplements", image_url: null };

    expect(resolveProductImageSource(product, [product])).toBeNull();
  });
});
