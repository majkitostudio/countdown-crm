import { getOrders, Order } from "./orders";
import { getLeads, Lead } from "./leads";
import { getProducts, Product } from "./products";

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
  suggested_discount: number; // e.g. 15%
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

  orders.forEach((order) => {
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
      lead_name: order.lead_name || lead?.full_name || "Customer",
      lead_phone: lead?.phone || "+420 774 123 890",
      product_id: order.product_id,
      product_title: order.product_title || product?.title || "Bio-Boost Stack",
      product_category: product?.category || "supplements",
      last_order_date: order.created_at,
      estimated_depletion_date: depletionDate.toISOString(),
      days_remaining: daysRemaining,
      urgency,
      suggested_discount: daysRemaining <= 3 ? 20 : 15,
    });
  });

  // Sort by urgency / lowest days_remaining first
  return opportunities.sort((a, b) => a.days_remaining - b.days_remaining);
}
