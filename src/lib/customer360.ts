import type { WorkspaceCallDTO, WorkspaceOrderDTO } from "./dal/activity";
import type { LeadDTO } from "./dal/leads";
import { aggregateCurrencyAmounts, singleCurrency, type CurrencyAmount } from "./currency";

type Customer360Lead = Pick<LeadDTO, "id" | "status">;
type Customer360Call = Pick<WorkspaceCallDTO, "created_at" | "outcome">;
type Customer360Order = Pick<WorkspaceOrderDTO, "id" | "created_at" | "product_title" | "total_amount" | "currency" | "status">;

export interface Customer360Snapshot {
  totalCalls: number;
  totalOrders: number;
  fulfilledOrders: number;
  totalRevenue: number;
  revenueByCurrency: CurrencyAmount[];
  currency: string | null;
  lastCallAt: string | null;
  lastCallOutcome: string | null;
  lastOrderAt: string | null;
  lastProduct: string | null;
  nextAction: {
    title: string;
    description: string;
    href: string;
  };
}

export interface Customer360Activity {
  calls: Customer360Call[];
  orders: Customer360Order[];
}

function latest<T extends { created_at: string }>(entries: T[]): T | null {
  return [...entries].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0] || null;
}

function isFulfilled(status: Customer360Order["status"]): boolean {
  return status === "completed" || status === "delivered";
}

/** Builds a deterministic retention snapshot from persisted lead activity. */
export function buildCustomer360Snapshot(
  lead: Customer360Lead,
  activity: Customer360Activity,
): Customer360Snapshot {
  const lastCall = latest(activity.calls);
  const lastOrder = latest(activity.orders);
  const fulfilledOrders = activity.orders.filter((order) => isFulfilled(order.status));
  const revenueByCurrency = aggregateCurrencyAmounts(
    fulfilledOrders,
    (order) => Number(order.total_amount || 0),
    (order) => order.currency,
  );
  const currency = singleCurrency(revenueByCurrency);
  const totalRevenue = currency ? revenueByCurrency[0]?.amount || 0 : 0;
  const lastFulfilledOrder = latest(fulfilledOrders);
  let nextAction: Customer360Snapshot["nextAction"];

  if (!lastCall && !lastOrder) {
    nextAction = {
      title: "Start first outreach",
      description: "Lead zatím nemá uložený hovor ani objednávku.",
      href: `/workspace?leadId=${encodeURIComponent(lead.id)}`,
    };
  } else if (lastOrder && ["pending", "in_progress", "sent"].includes(lastOrder.status)) {
    nextAction = {
      title: "Check order progress",
      description: `Poslední objednávka čeká na dokončení (${lastOrder.product_title}).`,
      href: `/orders/${lastOrder.id}`,
    };
  } else if (lastCall?.outcome === "followup_scheduled") {
    nextAction = {
      title: "Honor the scheduled follow-up",
      description: "Poslední hovor obsahuje naplánovaný follow-up.",
      href: `/workspace?leadId=${encodeURIComponent(lead.id)}`,
    };
  } else if (lastCall?.outcome === "no_answer") {
    nextAction = {
      title: "Try a new outreach window",
      description: "Poslední pokus skončil bez spojení.",
      href: `/workspace?leadId=${encodeURIComponent(lead.id)}`,
    };
  } else if (lastCall?.outcome === "objection") {
    nextAction = {
      title: "Review objection battlecards",
      description: "Před dalším hovorem projděte poslední zaznamenanou námitku.",
      href: "/products",
    };
  } else if (!lastOrder) {
    nextAction = {
      title: "Continue qualification",
      description: "Lead má kontaktovanou historii, ale zatím žádnou objednávku.",
      href: `/workspace?leadId=${encodeURIComponent(lead.id)}`,
    };
  } else if (lead.status === "customer") {
    nextAction = {
      title: "Review repeat-purchase opportunity",
      description: `Poslední dokončená objednávka: ${lastFulfilledOrder?.product_title || lastOrder.product_title}.`,
      href: `/workspace?leadId=${encodeURIComponent(lead.id)}`,
    };
  } else {
    nextAction = {
      title: "Review the latest timeline",
      description: "Zkontrolujte poslední kontakt před další akcí.",
      href: `/leads/${encodeURIComponent(lead.id)}`,
    };
  }

  return {
    totalCalls: activity.calls.length,
    totalOrders: activity.orders.length,
    fulfilledOrders: fulfilledOrders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    revenueByCurrency,
    currency,
    lastCallAt: lastCall?.created_at || null,
    lastCallOutcome: lastCall?.outcome || null,
    lastOrderAt: lastOrder?.created_at || null,
    lastProduct: lastOrder?.product_title || null,
    nextAction,
  };
}
