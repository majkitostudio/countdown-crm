import { createClient } from "./supabase/client";

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

let localOrdersStore: Order[] = [...INITIAL_MOCK_ORDERS];

/**
 * Fetch all orders
 */
export async function getOrders(): Promise<Order[]> {
  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("orders") as any).select("*");
    if (error || !data || data.length === 0) {
      return localOrdersStore;
    }
    return data as Order[];
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

  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("orders") as any).insert({
      lead_id: newOrder.lead_id,
      product_id: newOrder.product_id,
      total_amount: newOrder.total_amount,
      status: newOrder.status,
    });
  } catch (err) {
    console.warn("Supabase insert order skipped:", err);
  }

  localOrdersStore = [newOrder, ...localOrdersStore];
  return newOrder;
}
