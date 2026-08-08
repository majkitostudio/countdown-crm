import { createClient } from "./supabase/client";
import { fetchOrdersFromSupabase, createOrderInSupabase } from "./supabase/ordersService";

export interface Order {
  id: string;
  lead_id: string;
  lead_name: string;
  product_id: string;
  product_title: string;
  total_amount: number;
  status: "completed" | "pending" | "cancelled";
  agent_name: string;
  created_at: string;
}

export const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: "ord-901",
    lead_id: "lead-1",
    lead_name: "Eleanor Vance",
    product_id: "prod-1",
    product_title: "Bio-Boost Anti-Aging Stack",
    total_amount: 89.00,
    status: "completed",
    agent_name: "Alex Vance",
    created_at: "2026-07-28T14:30:00Z"
  },
  {
    id: "ord-902",
    lead_id: "lead-4",
    lead_name: "Jan Novák",
    product_id: "prod-3",
    product_title: "Smart Body Composition Scale",
    total_amount: 119.00,
    status: "completed",
    agent_name: "Sarah Connor",
    created_at: "2026-07-30T16:45:00Z"
  }
];

const ORDERS_STORAGE_KEY = "countdown_crm_orders_v1";

function loadLocalOrders(): Order[] {
  if (typeof window === "undefined") return INITIAL_MOCK_ORDERS;
  const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_ORDERS));
    return INITIAL_MOCK_ORDERS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_MOCK_ORDERS;
  }
}

function saveLocalOrders(orders: Order[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }
}

let localOrdersStore: Order[] = loadLocalOrders();

/**
 * Fetch all orders
 */
export async function getOrders(): Promise<Order[]> {
  try {
    const data = await fetchOrdersFromSupabase();
    if (data && data.length > 0) {
      return data;
    }
    return localOrdersStore;
  } catch (err) {
    console.warn("Supabase fetch orders failed, using local store:", err);
    return localOrdersStore;
  }
}

/**
 * Fetch orders for a specific lead
 */
export async function getOrdersByLeadId(leadId: string): Promise<Order[]> {
  const all = await getOrders();
  return all.filter((o) => o.lead_id === leadId);
}

/**
 * Create a new order
 */
export async function createOrder(orderPayload: Partial<Order>): Promise<Order> {
  const newOrder: Order = {
    id: orderPayload.id || `ord-${Date.now()}`,
    lead_id: orderPayload.lead_id || "lead-1",
    lead_name: orderPayload.lead_name || "Customer",
    product_id: orderPayload.product_id || "prod-1",
    product_title: orderPayload.product_title || "Bio-Boost Anti-Aging Stack",
    total_amount: orderPayload.total_amount || 89.00,
    status: orderPayload.status || "completed",
    agent_name: orderPayload.agent_name || "Operator",
    created_at: new Date().toISOString(),
  };

  createOrderInSupabase(newOrder).catch((err) =>
    console.warn("Supabase insert order skipped:", err)
  );

  localOrdersStore = [newOrder, ...localOrdersStore];
  saveLocalOrders(localOrdersStore);
  return newOrder;
}

