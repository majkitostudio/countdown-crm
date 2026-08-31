export interface DailyTeamSummary {
  date: string;
  calls: number;
  completedOrders: number;
  revenue: number;
  conversionRate: number;
}

interface DailyCall {
  created_at: string;
}

interface DailyOrder {
  created_at: string;
  status: string;
  total_amount: number | string | null;
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Calculates a UTC calendar-day summary from already workspace-scoped rows. */
export function getDailyTeamSummary(
  calls: DailyCall[],
  orders: DailyOrder[],
  now = new Date(),
): DailyTeamSummary {
  const date = now.toISOString().slice(0, 10);
  const todayCalls = calls.filter((call) => call.created_at.slice(0, 10) === date);
  const todayCompletedOrders = orders.filter(
    (order) => order.created_at.slice(0, 10) === date && order.status === "completed",
  );
  const revenue = todayCompletedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  return {
    date,
    calls: todayCalls.length,
    completedOrders: todayCompletedOrders.length,
    revenue: roundMetric(revenue),
    conversionRate: todayCalls.length > 0
      ? roundMetric((todayCompletedOrders.length / todayCalls.length) * 100)
      : 0,
  };
}
