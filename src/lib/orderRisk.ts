/**
 * Pickup risk for a sent package.
 *
 * The rule mirrors the database automation: a package sitting at a pickup point
 * for 3+ days without a completed pickup call is at risk and is routed to P4.
 * This module turns that rule into a single, testable classification the board
 * and the table can both use ("calm / warning / alarm").
 */

export const PICKUP_WARNING_DAYS = 2;
export const PICKUP_ALARM_DAYS = 3;

export type OrderRiskLevel = "calm" | "warning" | "alarm";

export interface OrderRiskSource {
  status: string;
  package_location?: string | null;
  package_arrived_at?: string | null;
  pickup_call_completed_at?: string | null;
}

export interface OrderRisk {
  level: OrderRiskLevel;
  /** Whole days the package has been at the pickup point, or null when not applicable. */
  daysOnPickup: number | null;
}

/**
 * Whole days a sent package has spent at its pickup point. Returns null when the
 * order is not a sent package already sitting at a pickup location.
 */
export function daysOnPickup(order: OrderRiskSource, now: number = Date.now()): number | null {
  if (order.status !== "sent" || !order.package_location || !order.package_arrived_at) {
    return null;
  }
  const diff = now - new Date(order.package_arrived_at).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Classifies pickup risk. A completed pickup call resolves the risk, because the
 * customer has already been contacted; the package then stays "calm" even if it
 * has not been collected yet.
 */
export function getOrderRisk(order: OrderRiskSource, now: number = Date.now()): OrderRisk {
  const days = daysOnPickup(order, now);
  if (days === null) {
    return { level: "calm", daysOnPickup: null };
  }
  if (order.pickup_call_completed_at) {
    return { level: "calm", daysOnPickup: days };
  }
  if (days >= PICKUP_ALARM_DAYS) {
    return { level: "alarm", daysOnPickup: days };
  }
  if (days >= PICKUP_WARNING_DAYS) {
    return { level: "warning", daysOnPickup: days };
  }
  return { level: "calm", daysOnPickup: days };
}

/** Counts packages at risk of missing the pickup window. */
export function countOrdersByRisk<T extends OrderRiskSource>(
  orders: readonly T[],
  now: number = Date.now(),
): { alarm: number; warning: number } {
  let alarm = 0;
  let warning = 0;
  for (const order of orders) {
    const level = getOrderRisk(order, now).level;
    if (level === "alarm") alarm += 1;
    else if (level === "warning") warning += 1;
  }
  return { alarm, warning };
}
