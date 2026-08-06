export interface ObjectionBattleCard {
  id: string;
  product_id?: string;
  product_title?: string;
  objection_category: "price" | "competitor" | "trust" | "timing";
  customer_phrase: string;
  rebuttal_arguments: string[];
  suggested_bundle_id?: string;
  created_at: string;
  updated_at: string;
}

const INITIAL_OBJECTIONS: ObjectionBattleCard[] = [
  {
    id: "obj-1",
    product_id: "prod-1",
    product_title: "Bio-Boost Anti-Aging Collagen Stack",
    objection_category: "price",
    customer_phrase: "Cena je příliš vysoká v porovnání s běžnými vitamíny v lékárně.",
    rebuttal_arguments: [
      "Zdůrazněte až 800% vyšší vstřebatelnost díky liposomální technologii oproti běžným pilulkám.",
      "Nabídněte 3-měsíční balíček se slevou 15 %, což sníží denní investici na pouhých 19 Kč.",
      "Připomeňte 30denní garanci vrácení peněz bez jakéhokoliv rizika."
    ],
    suggested_bundle_id: "prod-2",
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
  },
  {
    id: "obj-2",
    product_id: "prod-2",
    product_title: "Liposomal Vitamin C Supercharge",
    objection_category: "competitor",
    customer_phrase: "Používám už podobný doplňek stravy od jiné značky.",
    rebuttal_arguments: [
      "Zeptejte se, zda jejich současný produkt garantuje čisotu složení bez syntetických plniv.",
      "Vysvětlete patenty na švýcarské liposomální pouzdření v našem Bio-Boostu.",
      "Nabídněte porovnávací vzorek s 15% VIP slevou pro věrné zákazníky doplňků."
    ],
    suggested_bundle_id: "prod-1",
    created_at: "2026-08-02T11:00:00Z",
    updated_at: "2026-08-02T11:00:00Z",
  },
  {
    id: "obj-3",
    product_id: "prod-3",
    product_title: "Collagen Glow Facial Serum",
    objection_category: "timing",
    customer_phrase: "Nyní nemám čas to řešit, zavolejte mi příští měsíc.",
    rebuttal_arguments: [
      "Ověřte, zda je problémem čas nebo zda mají pochybnosti o rychlosti výsledků.",
      "Nabídněte rezervaci akční ceny ještě dnes s odloženým doručením na příští týden.",
      "Zajistěte odeslání 1-klikové platby na SMS/WhatsApp bez nutnosti zdlouhavého vyřizování."
    ],
    created_at: "2026-08-03T14:20:00Z",
    updated_at: "2026-08-03T14:20:00Z",
  },
];

let objectionsStore: ObjectionBattleCard[] = [...INITIAL_OBJECTIONS];

export function getObjectionCards(): ObjectionBattleCard[] {
  return objectionsStore;
}

export function saveObjectionCard(
  cardData: Omit<ObjectionBattleCard, "id" | "created_at" | "updated_at"> & { id?: string }
): ObjectionBattleCard {
  const now = new Date().toISOString();

  if (cardData.id) {
    const idx = objectionsStore.findIndex((c) => c.id === cardData.id);
    if (idx !== -1) {
      const updated: ObjectionBattleCard = {
        ...objectionsStore[idx],
        ...cardData,
        updated_at: now,
      };
      objectionsStore[idx] = updated;
      return updated;
    }
  }

  const newCard: ObjectionBattleCard = {
    ...cardData,
    id: `obj-${Date.now()}`,
    created_at: now,
    updated_at: now,
  };
  objectionsStore = [newCard, ...objectionsStore];
  return newCard;
}

export function deleteObjectionCard(id: string): void {
  objectionsStore = objectionsStore.filter((c) => c.id !== id);
}

export function matchObjectionToProduct(
  detectedObjection: string | null,
  product?: { title?: string; objections?: { id?: string; objection_title?: string; customer_phrase?: string; rebuttal_args?: string[]; rebuttals?: string[] }[] }
): { matchedTitle: string; matchScore: number; rebuttalArgs: string[] } {
  const cards = getObjectionCards();
  const lower = (detectedObjection || "").toLowerCase();

  const found = cards.find(
    (c) => c.customer_phrase.toLowerCase().includes(lower) || (lower && lower.includes(c.objection_category))
  );

  if (found && found.rebuttal_arguments.length > 0) {
    return {
      matchedTitle: found.customer_phrase,
      matchScore: 94,
      rebuttalArgs: found.rebuttal_arguments,
    };
  }

  if (product?.objections && product.objections.length > 0) {
    const obj = product.objections[0];
    return {
      matchedTitle: obj.customer_phrase || obj.objection_title || "Product Objection",
      matchScore: 88,
      rebuttalArgs: obj.rebuttals || obj.rebuttal_args || [],
    };
  }

  return {
    matchedTitle: detectedObjection || "Price & Bioavailability Objection",
    matchScore: 85,
    rebuttalArgs: [
      "Highlight 800% higher liposomal bioavailability vs standard vitamins.",
      "Offer 3-month supply bundle discount which lowers monthly cost by 25%.",
      "Emphasize 30-day money-back guarantee with zero risk."
    ]
  };
}
