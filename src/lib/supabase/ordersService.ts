import { createClient } from "./client";
import { Product, ProductCategory } from "../products";
import { Order } from "../orders";

/**
 * Supabase Data Access Service for Products Catalog & Sales Orders
 */

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return [];
  }

  return (data as any[]).map((p) => ({
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
  const supabase = createClient() as any;

  const payload = {
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

  return {
    id: data.id,
    title: data.title,
    category: data.category as ProductCategory,
    price: Number(data.price),
    currency: data.currency,
    description: data.description || "",
    image_url: data.image_url || "",
    in_stock: data.in_stock,
    created_at: data.created_at,
  };
}

export async function fetchOrdersFromSupabase(): Promise<Order[]> {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("orders")
    .select("*, leads(full_name), products(title)")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return [];
  }

  return (data as any[]).map((o) => ({
    id: o.id,
    lead_id: o.lead_id,
    lead_name: o.leads?.full_name || "Customer",
    product_id: o.product_id,
    product_title: o.products?.title || "Product Package",
    total_amount: Number(o.total_amount || 0),
    status: o.status as Order["status"],
    agent_name: "Senior Agent",
    created_at: o.created_at,
  }));
}

export async function createOrderInSupabase(orderPayload: Partial<Order>): Promise<Order | null> {
  const supabase = createClient() as any;

  const payload = {
    lead_id: orderPayload.lead_id && !orderPayload.lead_id.startsWith("lead-") ? orderPayload.lead_id : null,
    product_id: orderPayload.product_id && !orderPayload.product_id.startsWith("prod-") ? orderPayload.product_id : null,
    total_amount: orderPayload.total_amount || 89.0,
    status: orderPayload.status || "completed",
  };

  // If lead_id or product_id are fallback strings, attempt insert without strict FK check or fallback
  const { data, error } = await supabase
    .from("orders")
    .insert({
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

  return {
    id: data.id,
    lead_id: orderPayload.lead_id || "lead-1",
    lead_name: orderPayload.lead_name || "Customer",
    product_id: orderPayload.product_id || "prod-1",
    product_title: orderPayload.product_title || "Product Package",
    total_amount: Number(data.total_amount),
    status: data.status as Order["status"],
    agent_name: orderPayload.agent_name || "Senior Agent",
    created_at: data.created_at,
  };
}
