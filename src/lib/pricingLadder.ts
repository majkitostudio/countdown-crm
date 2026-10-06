import type { Product } from "./products";

export interface PricingTier {
  id: "standard" | "bonus" | "floor";
  name: string;
  badge: string;
  unitPrice: number;
  hasBonusBooks: boolean;
  bonusTitle?: string;
  isFloor: boolean;
  description: string;
}

export interface PricingLadder {
  anchorUnitPrice: number;
  standardUnitPrice: number;
  bonusUnitPrice: number;
  floorUnitPrice: number;
  currency: string;
  tiers: PricingTier[];
}

export interface PackageDurationOption {
  quantity: number;
  months: number;
  label: string;
  isRecommended: boolean;
  badge?: string;
}

export const PACKAGE_DURATION_OPTIONS: PackageDurationOption[] = [
  { quantity: 4, months: 4, label: "4 balení", isRecommended: true, badge: "Doporučená plná kúra" },
  { quantity: 3, months: 3, label: "3 balení", isRecommended: false },
  { quantity: 2, months: 2, label: "2 balení", isRecommended: false },
  { quantity: 1, months: 1, label: "1 balení", isRecommended: false, badge: "Základní zkušební" },
];

/**
 * Calculates tele-sales price ladder for any product:
 * - Anchor price (web catalogue reference, e.g. 1 399 Kč)
 * - Standard call price (first offer, e.g. 1 199 Kč)
 * - Bonus bundle price (discount + 2 e-books & library access, e.g. 999 Kč)
 * - Floor price (manager exception bottom limit, e.g. 799 Kč)
 */
export function getProductPricingLadder(product: Product | undefined): PricingLadder {
  const currency = product?.currency || "CZK";
  const standard = product ? Math.max(1, Number(product.price)) : 1199;

  // Tele-sales ladder heuristic:
  // If price is close to CZK 1199/1200, return exact clean tele-sales numbers
  let anchor = Math.round(standard * 1.17);
  let bonus = Math.round(standard * 0.83);
  let floor = Math.round(standard * 0.67);

  if (currency.toUpperCase() === "CZK" || currency.toUpperCase() === "KČ") {
    if (Math.abs(standard - 1199) <= 20) {
      anchor = 1399;
      bonus = 999;
      floor = 799;
    } else {
      // Round to neat 9s (e.g. 1399, 999, 799)
      anchor = Math.round((standard * 1.17) / 10) * 10 - 1;
      bonus = Math.round((standard * 0.83) / 10) * 10 - 1;
      floor = Math.round((standard * 0.67) / 10) * 10 - 1;
    }
  } else {
    // Other currencies (USD, EUR)
    anchor = Math.round(standard * 1.2);
    bonus = Math.max(1, Math.round(standard * 0.8));
    floor = Math.max(1, Math.round(standard * 0.6));
  }

  const tiers: PricingTier[] = [
    {
      id: "standard",
      name: "1. Standard nabídka",
      badge: "Výchozí start v hovoru",
      unitPrice: standard,
      hasBonusBooks: false,
      isFloor: false,
      description: "Doprava a doručení zdarma",
    },
    {
      id: "bonus",
      name: "2. Sleva + E-knihy",
      badge: "Při námitce ceny",
      unitPrice: bonus,
      hasBonusBooks: true,
      bonusTitle: "2x E-kniha o zdraví & doživotní přístup do e-knihovny ZDARMA",
      isFloor: false,
      description: "+ 2x E-kniha a přístup do e-knihovny",
    },
    {
      id: "floor",
      name: "3. Dno / Manažerská záchrana",
      badge: "Spodní limit (Dno)",
      unitPrice: floor,
      hasBonusBooks: true,
      bonusTitle: "Mimořádná záchranná cena + 2x E-kniha zdarma",
      isFloor: true,
      description: "Poslední záchrana hovoru (Minimální limit)",
    },
  ];

  return {
    anchorUnitPrice: anchor,
    standardUnitPrice: standard,
    bonusUnitPrice: bonus,
    floorUnitPrice: floor,
    currency,
    tiers,
  };
}

/**
 * Returns tailored call center operator pitch into phone based on tier, quantity and product title
 */
export function getOperatorPitch({
  tierId,
  quantity,
  unitPrice,
  anchorPrice,
  currency,
  productTitle,
}: {
  tierId: "standard" | "bonus" | "floor" | "custom";
  quantity: number;
  unitPrice: number;
  anchorPrice: number;
  currency: string;
  productTitle?: string;
}): { title: string; text: string; bonusText: string | null } {
  const total = quantity * unitPrice;
  const prod = productTitle || "tento produkt";
  const curr = currency || "Kč";

  if (tierId === "standard") {
    return {
      title: "Doporučený argument do telefonu (1. nabídka):",
      text: `„Na našem e-shopu stojí ${prod} běžně ${anchorPrice.toLocaleString("cs-CZ")} ${curr}. Pro vás mám dnes speciální telefonní cenu ${unitPrice.toLocaleString("cs-CZ")} ${curr}. Aby měla kúra maximální účinek, doporučuji kúru na ${quantity} měsíce (${quantity} balení) za celkem ${total.toLocaleString("cs-CZ")} ${curr}. Poštovné samozřejmě neplatíte.“`,
      bonusText: null,
    };
  }

  if (tierId === "bonus") {
    return {
      title: "Při námitce ceny – Sleva + E-knihy zdarma (2. úroveň):",
      text: `„Naprosto vám rozumím. Pojďme udělat kompromis: snížím vám cenu na ${unitPrice.toLocaleString("cs-CZ")} ${curr} za balení a navíc vám k objednávce ZDARMA přibalím 2 odborné publikace o zdraví a vitalitě a přístup do naší e-knihovny. Za celou kúru ${quantity} balení zaplatíte jen ${total.toLocaleString("cs-CZ")} ${curr}.“`,
      bonusText: "Bonus ke schodu: 2x E-kniha a přístup do e-knihovny zdarma.",
    };
  }

  if (tierId === "floor") {
    return {
      title: "Poslední záchrana hovoru – Dno ceníku (3. úroveň):",
      text: `„Nechci, abyste o své zdraví přišel jen kvůli penězům. Mám tady k dispozici mimořádnou manažerskou výjimku a mohu vám cenu stáhnout na absolutní minimum ${unitPrice.toLocaleString("cs-CZ")} ${curr} za balení – níže už opravdu jít nesmím. Za ${quantity} balení i s e-knihami je to pouhých ${total.toLocaleString("cs-CZ")} ${curr}. Platí to ale pouze teď v hovoru.“`,
      bonusText: "Manažerská záchranná cena na minimálním limitu.",
    };
  }

  return {
    title: "Individuální nabídka operátora:",
    text: `„Dohodli jsme se na individuální ceně ${unitPrice.toLocaleString("cs-CZ")} ${curr} za balení při počtu ${quantity} ks, celkem tedy ${total.toLocaleString("cs-CZ")} ${curr}.“`,
    bonusText: null,
  };
}
