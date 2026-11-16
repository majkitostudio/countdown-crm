import { aggregateCurrencyAmounts, isRecordedAmount, type CurrencyAmount } from "./currency";

export interface DailyTeamSummary {
  date: string;
  calls: number;
  completedOrders: number;
  completedOrdersWithoutCurrencyCount: number;
  completedOrdersWithoutAmountCount: number;
  revenue: number | null;
  revenueByCurrency: CurrencyAmount[];
  currency: string | null;
  conversionRate: number;
}

interface DailyCall {
  created_at: string;
}

interface DailyOrder {
  created_at: string;
  status: string;
  total_amount: number | string | null;
  currency?: string | null;
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
  const completedOrdersWithoutAmountCount = todayCompletedOrders.filter(
    (order) => !isRecordedAmount(order.total_amount),
  ).length;
  const completeOrders = todayCompletedOrders.filter(
    (order) => isRecordedAmount(order.total_amount) && Boolean(order.currency?.trim()),
  );
  const revenueByCurrency = aggregateCurrencyAmounts(
    completeOrders,
    (order) => Number(order.total_amount),
    (order) => order.currency,
  );
  const currencies = new Set(
    todayCompletedOrders
      .map((order) => order.currency?.trim().toUpperCase())
      .filter((value): value is string => Boolean(value)),
  );
  const currency = currencies.size === 1 ? Array.from(currencies)[0] ?? null : null;
  const completedOrdersWithoutCurrencyCount = todayCompletedOrders.filter((order) => !order.currency?.trim()).length;
  const revenue = todayCompletedOrders.length === 0
    ? 0
    : currency && completedOrdersWithoutCurrencyCount === 0 && completedOrdersWithoutAmountCount === 0
      ? revenueByCurrency[0]?.amount ?? 0
      : null;

  return {
    date,
    calls: todayCalls.length,
    completedOrders: todayCompletedOrders.length,
    completedOrdersWithoutCurrencyCount,
    completedOrdersWithoutAmountCount,
    revenue: revenue === null ? null : roundMetric(revenue),
    revenueByCurrency,
    currency: currency && completedOrdersWithoutCurrencyCount === 0 && completedOrdersWithoutAmountCount === 0
      ? currency
      : todayCompletedOrders.length === 0
        ? "CZK"
        : null,
    conversionRate: todayCalls.length > 0
      ? roundMetric((todayCompletedOrders.length / todayCalls.length) * 100)
      : 0,
  };
}
