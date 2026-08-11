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

export async function getOrders(): Promise<Order[]> {
  return fetchOrdersFromSupabase();
}

export async function getOrdersByLeadId(leadId: string): Promise<Order[]> {
  const orders = await getOrders();
  return orders.filter((order) => order.lead_id === leadId);
}

export async function createOrder(orderPayload: Partial<Order>): Promise<Order> {
  const savedOrder = await createOrderInSupabase(orderPayload);
  if (!savedOrder) throw new Error("Order could not be saved");
  return savedOrder;
}
