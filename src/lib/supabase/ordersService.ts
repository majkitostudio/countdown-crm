import { createClient } from "./client";
import { Database } from "./types";
import { Product, ProductCategory } from "../products";
import { getCurrentWorkspaceId } from "./workspace";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

/**
 * Supabase Data Access Service for Products Catalog & Sales Orders
 */

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Product query failed");
  }

  if (!data) {
    return [];
  }

  return (data as ProductRow[]).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category as ProductCategory,
    price: Number(p.price || 0),
    currency: p.currency || "USD",
    description: p.description || "",
    image_url: p.image_url || "",
    in_stock: p.in_stock ?? true,
    created_at: p.created_at,
  }));
}

export async function createProductInSupabase(product: Partial<Product>): Promise<Product | null> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const payload = {
    workspace_id: workspaceId,
    title: product.title || "New Product",
    category: product.category || "supplements",
    price: product.price || 29.99,
    currency: product.currency || "USD",
    description: product.description || null,
    image_url: product.image_url || null,
    in_stock: product.in_stock ?? true,
  };

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Product insert failed");
  }

  const typed = data as ProductRow;

  return {
    id: typed.id,
    title: typed.title,
    category: typed.category as ProductCategory,
    price: Number(typed.price),
    currency: typed.currency,
    description: typed.description || "",
    image_url: typed.image_url || "",
    in_stock: typed.in_stock,
    created_at: typed.created_at,
  };
}

export async function updateProductInSupabase(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const payload = {
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.price !== undefined ? { price: updates.price } : {}),
    ...(updates.currency !== undefined ? { currency: updates.currency } : {}),
    ...(updates.description !== undefined ? { description: updates.description || null } : {}),
    ...(updates.image_url !== undefined ? { image_url: updates.image_url || null } : {}),
    ...(updates.in_stock !== undefined ? { in_stock: updates.in_stock } : {}),
  };

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Product update failed");
  }

  const typed = data as ProductRow;
  return {
    id: typed.id,
    title: typed.title,
    category: typed.category as ProductCategory,
    price: Number(typed.price),
    currency: typed.currency,
    description: typed.description || "",
    image_url: typed.image_url || "",
    in_stock: typed.in_stock,
    created_at: typed.created_at,
  };
}
