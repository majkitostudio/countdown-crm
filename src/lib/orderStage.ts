/**
 * Shared fulfillment stages for the order board (Kanban) and the table filters.
 *
 * The database keeps seven truthful order statuses, but the operator and Team
 * Leader care about the package lifecycle. This module folds those statuses into
 * the six stages shown across the UI, so the board never hides an order and the
 * "Awaiting Pickup" stage is visible on its own.
 */
export type OrderStage =
  | "processing"
  | "sent"
  | "awaiting_pickup"
  | "delivered"
  | "returned"
  | "cancelled";

export interface OrderStageSource {
  status: string;
  package_location?: string | null;
}

/** Canonical stage order, left to right on the board. */
export const ORDER_STAGES: readonly OrderStage[] = [
  "processing",
  "sent",
  "awaiting_pickup",
  "delivered",
  "returned",
  "cancelled",
] as const;

export const ORDER_STAGE_LABELS: Record<OrderStage, string> = {
  processing: "Processing",
  sent: "Sent",
  awaiting_pickup: "Awaiting Pickup",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Canceled",
};

/**
 * Maps a raw order status (with its package location) to the shared stage.
 * Pre-shipment statuses (pending, completed, in_progress) fold into "Processing";
 * a sent package that already sits at a pickup point becomes "Awaiting Pickup".
 */
export function getOrderStage(order: OrderStageSource): OrderStage {
  switch (order.status) {
    case "sent":
      return order.package_location ? "awaiting_pickup" : "sent";
    case "delivered":
      return "delivered";
    case "returned":
      return "returned";
    case "cancelled":
      return "cancelled";
    case "pending":
    case "completed":
    case "in_progress":
      return "processing";
    default:
      return "processing";
  }
}
