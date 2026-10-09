export interface MonthlySettlementOrder {
  agent_id: string | null;
  total_amount: number | string | null;
  currency: string;
  status: string;
  delivered_at: string | null;
  returned_at: string | null;
}

export interface MonthlySettlementOrderTotals {
  deliveredCount: number;
  deliveredTotal: number;
  returnedCount: number;
  returnedTotal: number;
}

export function calculateMonthlySettlementOrderTotals(
  orders: readonly MonthlySettlementOrder[],
  userId: string,
  periodStart: string,
  periodEnd: string,
  currency: string,
): MonthlySettlementOrderTotals {
  const totals: MonthlySettlementOrderTotals = {
    deliveredCount: 0,
    deliveredTotal: 0,
    returnedCount: 0,
    returnedTotal: 0,
  };

  for (const order of orders) {
    if (order.agent_id !== userId || order.currency.toUpperCase() !== currency.toUpperCase()) continue;

    const deliveredInPeriod = Boolean(
      order.delivered_at && order.delivered_at >= periodStart && order.delivered_at < periodEnd,
    );
    const returnedInPeriod = Boolean(
      order.returned_at && order.returned_at >= periodStart && order.returned_at < periodEnd,
    );
    const amount = Number(order.total_amount) || 0;

    if ((order.status === "delivered" || order.status === "returned") && deliveredInPeriod) {
      totals.deliveredCount++;
      totals.deliveredTotal += amount;
    }

    if (order.status === "returned" && (returnedInPeriod || deliveredInPeriod)) {
      totals.returnedCount++;
      totals.returnedTotal += amount;
    }
  }

  return totals;
}
