import { getOrders } from "./orders";
import { getLeads } from "./leads";
import { getProducts } from "./products";

export interface ReorderOpportunity {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  product_id: string;
  product_title: string;
  product_category: string;
  last_order_date: string;
  estimated_depletion_date: string;
  days_remaining: number;
  urgency: "urgent" | "due_soon" | "upcoming";
}

/**
 * Calculates predictive re-order opportunities based on historical orders and consumption rates
 */
export async function getReorderOpportunities(): Promise<ReorderOpportunity[]> {
  const orders = await getOrders();
  const leads = await getLeads();
  const products = await getProducts();

  const opportunities: ReorderOpportunity[] = [];
  const now = new Date();
  const latestFulfilledOrderByLeadAndProduct = new Map<string, typeof orders[number]>();

  orders.forEach((order) => {
    if (order.status !== "completed" && order.status !== "delivered") return;

    const key = `${order.lead_id}:${order.product_id}`;
    const current = latestFulfilledOrderByLeadAndProduct.get(key);
    if (!current || Date.parse(order.created_at) > Date.parse(current.created_at)) {
      latestFulfilledOrderByLeadAndProduct.set(key, order);
    }
  });

  latestFulfilledOrderByLeadAndProduct.forEach((order) => {

    const lead = leads.find((l) => l.id === order.lead_id);
    const product = products.find((p) => p.id === order.product_id);

    const orderDate = new Date(order.created_at);
    
    // Consumption cycle by product category (Supplements: 30 days, Cosmetics: 45 days, Electronics: 365 days)
    let cycleDays = 30;
    if (product?.category === "cosmetics") cycleDays = 45;
    else if (product?.category === "electronics") cycleDays = 365;

    const depletionDate = new Date(orderDate.getTime() + cycleDays * 24 * 60 * 60 * 1000);
    const diffTime = depletionDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let urgency: ReorderOpportunity["urgency"] = "upcoming";
    if (daysRemaining <= 3) urgency = "urgent";
    else if (daysRemaining <= 10) urgency = "due_soon";

    opportunities.push({
      id: `reorder-${order.id}`,
      lead_id: order.lead_id,
      lead_name: order.lead_name || lead?.full_name || "Unknown customer",
      lead_phone: lead?.phone || "Unavailable",
      product_id: order.product_id,
      product_title: order.product_title || product?.title || "Unknown product",
      product_category: product?.category || "Unknown category",
      last_order_date: order.created_at,
      estimated_depletion_date: depletionDate.toISOString(),
      days_remaining: daysRemaining,
      urgency,
    });
  });

  // Only surface estimates that are due within the window promised by the UI.
  return opportunities
    .filter((opportunity) => opportunity.days_remaining <= 14)
    .sort((a, b) => a.days_remaining - b.days_remaining);
}
