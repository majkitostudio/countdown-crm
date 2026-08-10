import { createClient } from "./client";
import { Database } from "./types";
import { Product, ProductCategory } from "../products";
import { Order } from "../orders";
import { getCurrentWorkspaceId } from "./workspace";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

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

export async function fetchOrdersFromSupabase(): Promise<Order[]> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*, leads(full_name), products(title)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Order query failed");
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as unknown as (OrderRow & { leads?: { full_name: string } | null; products?: { title: string } | null })[]).map((o) => ({
    id: o.id,
    lead_id: o.lead_id || "",
    lead_name: o.leads?.full_name || "Customer",
    product_id: o.product_id || "",
    product_title: o.products?.title || "Product Package",
    total_amount: Number(o.total_amount || 0),
    status: o.status as Order["status"],
    agent_name: "Senior Agent",
    created_at: o.created_at,
  }));
}

export async function createOrderInSupabase(orderPayload: Partial<Order>): Promise<Order | null> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  if (!orderPayload.lead_id || !orderPayload.product_id) {
    throw new Error("Order requires a lead and a product");
  }

  const [{ data: lead, error: leadError }, { data: product, error: productError }] = await Promise.all([
    supabase.from("leads").select("id").eq("id", orderPayload.lead_id).eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("products").select("id").eq("id", orderPayload.product_id).eq("workspace_id", workspaceId).maybeSingle(),
  ]);

  if (leadError || productError || !lead || !product) {
    throw new Error("Order references an invalid or foreign-workspace lead/product");
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      workspace_id: workspaceId,
      lead_id: orderPayload.lead_id,
      product_id: orderPayload.product_id,
      total_amount: orderPayload.total_amount || 0,
      status: orderPayload.status || "completed",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Order insert failed");
  }

  const typed = data as OrderRow;

  return {
    id: typed.id,
    lead_id: typed.lead_id || orderPayload.lead_id,
    lead_name: orderPayload.lead_name || "Customer",
    product_id: typed.product_id || orderPayload.product_id,
    product_title: orderPayload.product_title || "Product Package",
    total_amount: Number(typed.total_amount),
    status: typed.status as Order["status"],
    agent_name: orderPayload.agent_name || "Senior Agent",
    created_at: typed.created_at,
  };
}
