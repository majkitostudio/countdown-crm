import { listLeadOrdersAction, listOrdersAction } from "@/app/actions/crm";

export interface Order {
  id: string;
  lead_id: string;
  lead_name: string;
  product_id: string;
  product_title: string;
  total_amount: number;
  currency: string;
  items: Array<{
    id: string;
    product_id: string;
    product_title: string;
    unit_price: number;
    minimum_unit_price: number;
    quantity: number;
    line_total: number;
    currency: string;
  }>;
  status: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";
  order_source: "previous_call" | "email" | "web_form" | "manual" | "other";
  source_note: string | null;
  status_history: Array<{
    id: string;
    from_status: Order["status"] | null;
    to_status: Order["status"];
    actor_id: string | null;
    actor_name: string;
    note: string | null;
    created_at: string;
  }>;
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
    currency: order.currency,
    items: order.items,
    status: order.status,
    order_source: order.order_source,
    source_note: order.source_note,
    status_history: order.status_history,
    agent_name: order.agent_name,
    created_at: order.created_at,
  }));
}

export async function getOrdersByLeadId(leadId: string): Promise<Order[]> {
  const orders = await listLeadOrdersAction(leadId);
  return orders.map((order) => ({
    id: order.id,
    lead_id: order.lead_id,
    lead_name: order.lead_name,
    product_id: order.product_id,
    product_title: order.product_title,
    total_amount: order.total_amount,
    currency: order.currency,
    items: order.items,
    status: order.status,
    order_source: order.order_source,
    source_note: order.source_note,
    status_history: order.status_history,
    agent_name: order.agent_name,
    created_at: order.created_at,
  }));
}
