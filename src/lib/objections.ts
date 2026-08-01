import { Product, Objection } from "./products";

export interface ObjectionMatchResult {
  matchedTitle: string;
  matchScore: number; // 0 - 100%
  category: "Price" | "Quality/Ingredients" | "Competitor/Alternative" | "General";
  rebuttalArgs: string[];
}

/**
 * Matches detected objection from Gemini AI transcript analysis against the specific product objection database
 */
export function matchObjectionToProduct(
  detectedObjectionText: string | null,
  product: Product | null
): ObjectionMatchResult {
  if (!detectedObjectionText || !product) {
    return {
      matchedTitle: "General Value Inquiry",
      matchScore: 80,
      category: "General",
      rebuttalArgs: [
        `Highlight key benefits and unique selling proposition of ${product?.title || "product"}.`,
        "Ask customer about their personal health or beauty routine.",
        "Emphasize 30-day risk-free satisfaction guarantee."
      ]
    };
  }

  const text = detectedObjectionText.toLowerCase();

  // Check product's registered custom objections first
  if (product.objections && product.objections.length > 0) {
    for (const obj of product.objections) {
      const objTitle = obj.objection_title.toLowerCase();
      if (
        (text.includes("price") || text.includes("cena") || text.includes("drahé")) &&
        (objTitle.includes("price") || objTitle.includes("cena"))
      ) {
        return {
          matchedTitle: obj.objection_title,
          matchScore: 96,
          category: "Price",
          rebuttalArgs: obj.rebuttal_args,
        };
      }

      if (
        (text.includes("ingredient") || text.includes("složení") || text.includes("allergy") || text.includes("irrita")) &&
        (objTitle.includes("irritat") || objTitle.includes("allerg") || objTitle.includes("složení"))
      ) {
        return {
          matchedTitle: obj.objection_title,
          matchScore: 94,
          category: "Quality/Ingredients",
          rebuttalArgs: obj.rebuttal_args,
        };
      }
    }
  }

  // Fallback category matching
  if (text.includes("price") || text.includes("cena") || text.includes("drahé") || text.includes("expensive")) {
    return {
      matchedTitle: "Price Perception Objection",
      matchScore: 90,
      category: "Price",
      rebuttalArgs: [
        `Highlight pharmaceutical-grade liposomal bioavailability of ${product.title} (up to 800% higher absorption).`,
        "Offer 3-month supply bundle discount which lowers monthly cost by 25%.",
        "Emphasize 30-day money-back guarantee with zero risk."
      ]
    };
  }

  if (text.includes("already") || text.includes("používám") || text.includes("jinou") || text.includes("competitor")) {
    return {
      matchedTitle: "Current Competitor Product Objection",
      matchScore: 88,
      category: "Competitor/Alternative",
      rebuttalArgs: [
        "Ask customer about their current energy and skin satisfaction levels.",
        `Explain that ${product.title} contains proprietary active complexes not present in retail brands.`,
        "Suggest trying for 14 days alongside current routine to compare results."
      ]
    };
  }

  return {
    matchedTitle: detectedObjectionText,
    matchScore: 85,
    category: "General",
    rebuttalArgs: [
      `Detail unique clinical formulation of ${product.title}.`,
      "Share customer review quotes and satisfaction data.",
      "Offer sample packet with current order."
    ]
  };
}
