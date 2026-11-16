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
  const primaryCurrency = (primaryProduct.currency || "CZK").toUpperCase();
  const otherProducts = allProducts.filter(
    (p) => p.id !== primaryProduct.id && (p.currency || "CZK").toUpperCase() === primaryCurrency,
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

    let reason = `78 % zákazníků, kteří kupují ${primaryProduct.title}, přidává také ${prod.title} pro maximální výsledky.`;
    if (primaryProduct.category === "supplements" && prod.category === "cosmetics") {
      reason = "Spojuje buněčnou dlouhověkost podpořenou NAD+ s vnější hydratací kyselinou hyaluronovou pro zářivou pleť po 24 hodin.";
    } else if (primaryProduct.category === "supplements" && prod.category === "electronics") {
      reason = "Sledujte přesné ukazatele složení těla (podíl tuku a svalů) a měřte pokrok při užívání doplňků.";
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
