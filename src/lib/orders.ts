import { listOrdersAction } from "@/app/actions/crm";

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
  const orders = await listOrdersAction();
  return orders.map((order) => ({
    id: order.id,
    lead_id: order.lead_id,
    lead_name: order.lead_name,
    product_id: order.product_id,
    product_title: order.product_title,
    total_amount: order.total_amount,
    status: order.status,
    agent_name: order.agent_name,
    created_at: order.created_at,
  }));
}

export async function getOrdersByLeadId(leadId: string): Promise<Order[]> {
  const orders = await getOrders();
  return orders.filter((order) => order.lead_id === leadId);
}
