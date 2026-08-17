import {
  createProductAction,
  listProductsAction,
  updateProductAction,
} from "@/app/actions/products";

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
  const data = await listProductsAction({
    category: isProductCategory(options?.category) ? options.category : undefined,
    search: options?.search,
    inStockOnly: options?.inStockOnly,
  });

  return data.map((product) => ({
    id: product.id,
    title: product.title,
    category: product.category,
    price: Number(product.price),
    currency: product.currency || "USD",
    description: product.description || "",
    image_url: product.image_url || "",
    in_stock: product.in_stock ?? true,
    created_at: product.created_at,
  }));
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

  const saved = await createProductAction({
    title: newProduct.title!,
    category: newProduct.category!,
    price: newProduct.price!,
    currency: newProduct.currency,
    description: newProduct.description,
    image_url: newProduct.image_url,
    in_stock: newProduct.in_stock,
  });

  return {
    id: saved.id,
    title: saved.title,
    category: saved.category,
    price: Number(saved.price),
    currency: saved.currency || "USD",
    description: saved.description || "",
    image_url: saved.image_url || "",
    in_stock: saved.in_stock ?? true,
    created_at: saved.created_at,
  };
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const saved = await updateProductAction(id, {
    title: updates.title,
    category: updates.category,
    price: updates.price,
    currency: updates.currency,
    description: updates.description,
    image_url: updates.image_url,
    in_stock: updates.in_stock,
  });

  return {
    id: saved.id,
    title: saved.title,
    category: saved.category,
    price: Number(saved.price),
    currency: saved.currency || "USD",
    description: saved.description || "",
    image_url: saved.image_url || "",
    in_stock: saved.in_stock ?? true,
    created_at: saved.created_at,
  };
}

function isProductCategory(value: string | undefined): value is ProductCategory {
  return value === "supplements" || value === "cosmetics" || value === "electronics";
}
