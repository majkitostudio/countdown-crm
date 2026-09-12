import { describe, expect, it } from "vitest";
import { resolveSelectedCatalogProduct } from "@/lib/productCatalogViewState";
import type { Product } from "@/lib/products";

const staleProduct: Product = {
  id: "product-1",
  title: "Joint support",
  category: "supplements",
  price: 499,
  currency: "CZK",
  description: "Supports comfortable movement.",
  image_url: "",
  in_stock: true,
  created_at: "2026-09-08T10:00:00.000Z",
  objections: [],
};

describe("resolveSelectedCatalogProduct", () => {
  it("uses the refreshed catalog snapshot for an open product drawer", () => {
    const refreshedProduct: Product = {
      ...staleProduct,
      objections: [{
        id: "objection-2",
        product_id: "product-1",
        objection_title: "Needs proof",
        rebuttal_args: ["Share the independent trial."],
      }],
    };

    expect(resolveSelectedCatalogProduct([refreshedProduct], staleProduct.id)).toEqual(refreshedProduct);
  });
});
