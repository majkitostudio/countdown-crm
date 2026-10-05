import { describe, expect, it } from "vitest";
import {
  getProductPricingLadder,
  getOperatorPitch,
  PACKAGE_DURATION_OPTIONS,
} from "@/lib/pricingLadder";
import type { Product } from "@/lib/products";

describe("Product pricing ladder and negotiation logic", () => {
  const czechProduct: Product = {
    id: "prod-1",
    title: "Kloubní Výživa Forte",
    category: "supplements",
    price: 1199,
    currency: "CZK",
    description: "Kloubní výživa pro zdraví chrupavek",
    image_url: "https://example.com/gel.jpg",
    in_stock: true,
    created_at: "2026-09-01T00:00:00Z",
  };

  it("calculates exact tele-sales ladder for standard 1199 CZK product", () => {
    const ladder = getProductPricingLadder(czechProduct);

    expect(ladder.standardUnitPrice).toBe(1199);
    expect(ladder.anchorUnitPrice).toBe(1399); // Web catalog anchor
    expect(ladder.bonusUnitPrice).toBe(999); // Discount + e-books bonus
    expect(ladder.floorUnitPrice).toBe(799); // Manager exception floor
    expect(ladder.currency).toBe("CZK");

    expect(ladder.tiers).toHaveLength(3);
    expect(ladder.tiers[0]).toMatchObject({ id: "standard", unitPrice: 1199 });
    expect(ladder.tiers[1]).toMatchObject({ id: "bonus", unitPrice: 999, hasBonusBooks: true });
    expect(ladder.tiers[2]).toMatchObject({ id: "floor", unitPrice: 799, isFloor: true });
  });

  it("provides recommended 4-month course as primary package option", () => {
    const rec = PACKAGE_DURATION_OPTIONS.find((opt) => opt.isRecommended);
    expect(rec).toBeDefined();
    expect(rec?.quantity).toBe(4);
    expect(rec?.months).toBe(4);
    expect(rec?.badge).toContain("Doporučená plná kúra");
  });

  it("generates persuasive operator pitch for each tier", () => {
    const normalize = (str: string) => str.replace(/[\s\u00A0]+/g, " ");

    const standardPitch = getOperatorPitch({
      tierId: "standard",
      quantity: 4,
      unitPrice: 1199,
      anchorPrice: 1399,
      currency: "Kč",
      productTitle: "Kloubní Výživa Forte",
    });
    expect(standardPitch.title).toContain("1. nabídka");
    expect(normalize(standardPitch.text)).toContain("1 399 Kč");
    expect(normalize(standardPitch.text)).toContain("1 199 Kč");
    expect(normalize(standardPitch.text)).toContain("4 796 Kč");
    expect(standardPitch.bonusText).toBeNull();

    const bonusPitch = getOperatorPitch({
      tierId: "bonus",
      quantity: 4,
      unitPrice: 999,
      anchorPrice: 1399,
      currency: "Kč",
      productTitle: "Kloubní Výživa Forte",
    });
    expect(bonusPitch.title).toContain("Sleva + E-knihy");
    expect(normalize(bonusPitch.text)).toContain("999 Kč");
    expect(bonusPitch.text).toContain("e-knihovny");
    expect(bonusPitch.bonusText).toContain("E-kniha");

    const floorPitch = getOperatorPitch({
      tierId: "floor",
      quantity: 4,
      unitPrice: 799,
      anchorPrice: 1399,
      currency: "Kč",
      productTitle: "Kloubní Výživa Forte",
    });
    expect(floorPitch.title).toContain("Dno");
    expect(normalize(floorPitch.text)).toContain("799 Kč");
    expect(floorPitch.text).toContain("manažerskou výjimku");
  });
});
