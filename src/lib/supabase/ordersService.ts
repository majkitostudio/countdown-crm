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

  if (error || !data || data.length === 0) {
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
    console.error("[ordersService] Error creating product in Supabase:", error);
    return null;
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

  if (error || !data || data.length === 0) {
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

  const payload = {
    lead_id: orderPayload.lead_id && !orderPayload.lead_id.startsWith("lead-") ? orderPayload.lead_id : null,
    product_id: orderPayload.product_id && !orderPayload.product_id.startsWith("prod-") ? orderPayload.product_id : null,
    total_amount: orderPayload.total_amount || 89.0,
    status: orderPayload.status || "completed",
  };

  const { data, error } = await supabase
    .from("orders")
    .insert({
      workspace_id: workspaceId,
      total_amount: payload.total_amount,
      status: payload.status,
      ...(payload.lead_id ? { lead_id: payload.lead_id } : {}),
      ...(payload.product_id ? { product_id: payload.product_id } : {}),
    })
    .select()
    .single();

  if (error || !data) {
    console.warn("[ordersService] Error inserting order in Supabase:", error);
    return null;
  }

  const typed = data as OrderRow;

  return {
    id: typed.id,
    lead_id: orderPayload.lead_id || "lead-1",
    lead_name: orderPayload.lead_name || "Customer",
    product_id: orderPayload.product_id || "prod-1",
    product_title: orderPayload.product_title || "Product Package",
    total_amount: Number(typed.total_amount),
    status: typed.status as Order["status"],
    agent_name: orderPayload.agent_name || "Senior Agent",
    created_at: typed.created_at,
  };
}
