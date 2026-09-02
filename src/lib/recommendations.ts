import { Product } from "./products";

export interface Recommendation {
  recommendedProduct: Product;
  reason: string;
  bundleDiscountPercent: number;
  originalPrice: number;
  bundlePrice: number;
  type: "cross-sell" | "upsell";
}

/**
 * Returns intelligent cross-sell recommendations for a given primary product
 */
export function getCrossSellRecommendations(
  primaryProduct: Product | null,
  allProducts: Product[]
): Recommendation[] {
  if (!primaryProduct || allProducts.length === 0) return [];

  // Filter out the primary product
  const primaryCurrency = (primaryProduct.currency || "USD").toUpperCase();
  const otherProducts = allProducts.filter(
    (p) => p.id !== primaryProduct.id && (p.currency || "USD").toUpperCase() === primaryCurrency,
  );

  // Check if primary product explicitly specifies cross_sell_ids
  let targetProducts: Product[] = [];
  if (primaryProduct.cross_sell_ids && primaryProduct.cross_sell_ids.length > 0) {
    targetProducts = otherProducts.filter((p) => primaryProduct.cross_sell_ids?.includes(p.id));
  }

  // Fallback if no explicit cross_sell_ids found
  if (targetProducts.length === 0) {
    targetProducts = otherProducts.slice(0, 2);
  }

  return targetProducts.map((prod) => {
    const discount = 15; // 15% bundle discount
    const discountedPrice = prod.price * (1 - discount / 100);

    let reason = `78% of customers buying ${primaryProduct.title} also add ${prod.title} for maximum results.`;
    if (primaryProduct.category === "supplements" && prod.category === "cosmetics") {
      reason = "Combines internal NAD+ cellular longevity with external hyaluronic hydration for 24h glow.";
    } else if (primaryProduct.category === "supplements" && prod.category === "electronics") {
      reason = "Track exact body composition biomarkers (Fat %, Muscle %) to measure supplement progress.";
    }

    return {
      recommendedProduct: prod,
      reason,
      bundleDiscountPercent: discount,
      originalPrice: prod.price,
      bundlePrice: Number(discountedPrice.toFixed(2)),
      type: "cross-sell",
    };
  });
}
