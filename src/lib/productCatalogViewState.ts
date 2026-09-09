import type { Product } from "@/lib/products";

export function resolveSelectedCatalogProduct(products: Product[], productId: string | null): Product | null {
  return products.find((product) => product.id === productId) || null;
}
