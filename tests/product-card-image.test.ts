import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/products/ProductCard";
import type { Product } from "@/lib/products";

const product: Product = {
  id: "product-1",
  title: "Product without an image",
  category: "supplements",
  price: 499,
  currency: "CZK",
  description: "Test product",
  image_url: "",
  in_stock: true,
  created_at: "2026-09-05T12:00:00.000Z",
};

describe("ProductCard image fallback", () => {
  it("does not render an img element with an empty src", () => {
    const html = renderToStaticMarkup(React.createElement(ProductCard, {
      product,
      onOpenObjections: vi.fn(),
      onEditProduct: vi.fn(),
      orderCount: 0,
      onReassignOrders: vi.fn(),
      onDeleteProduct: vi.fn(),
    }));

    expect(html).not.toContain("<img");
    expect(html).toContain("No product image");
  });
});
