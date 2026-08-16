import {
  fetchProductsFromSupabase,
  createProductInSupabase,
  updateProductInSupabase,
} from "./supabase/ordersService";

export type ProductCategory = "supplements" | "cosmetics" | "electronics";

export interface Objection {
  id: string;
  product_id?: string | null;
  objection_title: string;
  rebuttal_args: string[];
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

export async function getProducts(options?: {
  category?: string;
  search?: string;
  inStockOnly?: boolean;
}): Promise<Product[]> {
  const data = await fetchProductsFromSupabase();
  let filtered = data;

  if (options?.category && options.category !== "all") {
    filtered = filtered.filter((product) => product.category === options.category);
  }
  if (options?.inStockOnly) {
    filtered = filtered.filter((product) => product.in_stock);
  }
  if (options?.search) {
    const query = options.search.toLowerCase();
    filtered = filtered.filter((product) =>
      [product.title, product.description, product.category].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }

  return filtered;
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const newProduct: Partial<Product> = {
    title: product.title || "New Product",
    category: (product.category as ProductCategory) || "supplements",
    price: Number(product.price) || 0,
    currency: product.currency || "USD",
    description: product.description || "",
    image_url: product.image_url || "",
    in_stock: product.in_stock ?? true,
  };

  const saved = await createProductInSupabase(newProduct);
  if (!saved) throw new Error("Product was not saved to Supabase");
  return saved;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  return updateProductInSupabase(id, updates);
}
