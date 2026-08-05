import { createClient } from "./supabase/client";

export type ProductCategory = "supplements" | "cosmetics" | "electronics";

export interface Objection {
  id: string;
  product_id?: string;
  objection_title: string;
  rebuttal_args: string[];
  frequency_score?: number; // 1-10 popularity/frequency
}

export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  price: number;
  currency: string;
  description: string;
  image_url: string;
  in_stock: boolean;
  stock_count?: number;
  cross_sell_ids?: string[];
  objections?: Objection[];
  created_at: string;
}

export const INITIAL_MOCK_OBJECTIONS: Record<string, Objection[]> = {
  "prod-1": [
    {
      id: "obj-101",
      product_id: "prod-1",
      objection_title: "Price is too high compared to standard pharmacy vitamins",
      rebuttal_args: [
        "Highlight pharmaceutical-grade liposomal bioavailability (up to 800% higher absorption than regular pills).",
        "Offer 3-month supply bundle which lowers monthly price by 25%.",
        "Emphasize 30-day money-back guarantee with zero risk."
      ],
      frequency_score: 9
    },
    {
      id: "obj-102",
      product_id: "prod-1",
      objection_title: "I am already taking multivitamin supplements",
      rebuttal_args: [
        "Ask about current energy levels in the afternoon (3 PM energy slump).",
        "Explain that standard multivitamins lack NAD+ boosters and NMN present in Bio-Boost.",
        "Suggest trying for 14 days alongside current regimen to test difference."
      ],
      frequency_score: 7
    }
  ],
  "prod-2": [
    {
      id: "obj-201",
      product_id: "prod-2",
      objection_title: "Concern about skin irritation or allergic reaction",
      rebuttal_args: [
        "Formulated with 100% hypoallergenic, fragrance-free swiss alpine botanicals.",
        "Dermatologically tested on sensitive skin with 0% reported irritation.",
        "Include free 5ml patch-test sample with the order."
      ],
      frequency_score: 8
    }
  ],
  "prod-3": [
    {
      id: "obj-301",
      product_id: "prod-3",
      objection_title: "Already have a standard home scale",
      rebuttal_args: [
        "Standard scales only measure weight; Smart Body Scale tracks 14 biomarkers (Visceral Fat, Muscle Mass, Metabolic Age).",
        "Syncs automatically via Bluetooth with iOS & Android health apps.",
        "Ideal for tracking real progress when taking supplements."
      ],
      frequency_score: 9
    }
  ]
};

export const INITIAL_MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    title: "Bio-Boost Anti-Aging Stack",
    category: "supplements",
    price: 89.00,
    currency: "USD",
    description: "Premium NAD+ & NMN cellular longevity complex designed to boost mitochondrial energy, mental clarity, and skin elasticity.",
    image_url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_count: 142,
    cross_sell_ids: ["prod-2", "prod-3"],
    objections: INITIAL_MOCK_OBJECTIONS["prod-1"],
    created_at: "2026-07-01T10:00:00Z"
  },
  {
    id: "prod-2",
    title: "Cellular Hyaluron Serum 3.0",
    category: "cosmetics",
    price: 64.50,
    currency: "USD",
    description: "Triple-molecular weight hyaluronic acid serum infused with peptides for intense 24h hydration and wrinkle smoothing.",
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_count: 89,
    cross_sell_ids: ["prod-1"],
    objections: INITIAL_MOCK_OBJECTIONS["prod-2"],
    created_at: "2026-07-05T12:00:00Z"
  },
  {
    id: "prod-3",
    title: "Smart Body Composition Scale",
    category: "electronics",
    price: 119.00,
    currency: "USD",
    description: "High-precision bio-impedance body scale tracking 14 metrics (muscle, body fat, bone density, BMR) with LED matrix display.",
    image_url: "https://images.unsplash.com/photo-1576243345690-4e4b79b63288?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_count: 35,
    cross_sell_ids: ["prod-1"],
    objections: INITIAL_MOCK_OBJECTIONS["prod-3"],
    created_at: "2026-07-10T14:30:00Z"
  },
  {
    id: "prod-4",
    title: "Liposomal Magnesium Glycinate",
    category: "supplements",
    price: 38.00,
    currency: "USD",
    description: "High-absorption magnesium formula supporting deep REM sleep, muscle recovery, and stress reduction without digestive discomfort.",
    image_url: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_count: 210,
    cross_sell_ids: ["prod-1"],
    objections: [
      {
        id: "obj-401",
        product_id: "prod-4",
        objection_title: "Why buy magnesium when I can get cheap oxide at grocery store?",
        rebuttal_args: [
          "Magnesium oxide has only 4% absorption rate and causes stomach distress.",
          "Glycinate chelate is bound to amino acid for 85%+ absorption directly into neural tissue."
        ]
      }
    ],
    created_at: "2026-07-12T09:00:00Z"
  },
  {
    id: "prod-5",
    title: "Radiance Vitamin C Night Oil",
    category: "cosmetics",
    price: 52.00,
    currency: "USD",
    description: "Cold-pressed rosehip oil enriched with 15% THD Ascorbate for dark spot reduction and overnight glow restoration.",
    image_url: "https://images.unsplash.com/photo-1608248597359-0e695029057b?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_count: 64,
    cross_sell_ids: ["prod-2"],
    created_at: "2026-07-15T11:00:00Z"
  },
  {
    id: "prod-6",
    title: "Sonic Facial Exfoliation Cleanser",
    category: "electronics",
    price: 79.99,
    currency: "USD",
    description: "Medical-grade silicone sonic facial brush operating at 8,000 pulsations/min for deep pore cleaning and micro-circulation.",
    image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
    in_stock: false,
    stock_count: 0,
    cross_sell_ids: ["prod-2", "prod-5"],
    created_at: "2026-07-18T16:00:00Z"
  }
];

const PRODUCTS_STORAGE_KEY = "countdown_crm_products_v1";

function loadLocalProducts(): Product[] {
  if (typeof window === "undefined") return INITIAL_MOCK_PRODUCTS;
  const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_PRODUCTS));
    return INITIAL_MOCK_PRODUCTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_MOCK_PRODUCTS;
  }
}

function saveLocalProducts(products: Product[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  }
}

let localProductsStore: Product[] = loadLocalProducts();

/**
 * Fetch products with category filter and search
 */
export async function getProducts(options?: {
  category?: string;
  search?: string;
  inStockOnly?: boolean;
}): Promise<Product[]> {
  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from("products") as any).select("*");

    if (options?.category && options.category !== "all") {
      query = query.eq("category", options.category);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return filterLocalProducts(options);
    }

    // Merge objections from local store if needed
    const dbProducts = (data as Product[]).map((p) => ({
      ...p,
      objections: INITIAL_MOCK_OBJECTIONS[p.id] || [],
    }));
    return dbProducts;
  } catch (err) {
    console.warn("Supabase products fetch failed, using mock products:", err);
    return filterLocalProducts(options);
  }
}

function filterLocalProducts(options?: {
  category?: string;
  search?: string;
  inStockOnly?: boolean;
}): Product[] {
  let result = [...localProductsStore];

  if (options?.category && options.category !== "all") {
    result = result.filter((p) => p.category === options.category);
  }

  if (options?.inStockOnly) {
    result = result.filter((p) => p.in_stock);
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  return result;
}

/**
 * Add product to store
 */
export async function createProduct(product: Partial<Product>): Promise<Product> {
  const newProd: Product = {
    id: product.id || `prod-${Date.now()}`,
    title: product.title || "New Product",
    category: (product.category as ProductCategory) || "supplements",
    price: Number(product.price) || 49.99,
    currency: product.currency || "USD",
    description: product.description || "Product description...",
    image_url: product.image_url || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80",
    in_stock: product.in_stock ?? true,
    stock_count: product.stock_count ?? 50,
    cross_sell_ids: product.cross_sell_ids || [],
    objections: product.objections || [],
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("products") as any).insert({
      title: newProd.title,
      category: newProd.category,
      price: newProd.price,
      currency: newProd.currency,
      description: newProd.description,
      image_url: newProd.image_url,
      in_stock: newProd.in_stock,
    });
  } catch (err) {
    console.warn("Supabase create product skipped:", err);
  }

  localProductsStore = [newProd, ...localProductsStore];
  saveLocalProducts(localProductsStore);
  return newProd;
}

/**
 * Update existing product
 */
export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const idx = localProductsStore.findIndex((p) => p.id === id);
  if (idx !== -1) {
    localProductsStore[idx] = {
      ...localProductsStore[idx],
      ...updates,
    };
    saveLocalProducts(localProductsStore);
  }

  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("products") as any).update(updates).eq("id", id);
  } catch (err) {
    console.warn("Supabase update product skipped:", err);
  }

  return localProductsStore[idx] || null;
}

