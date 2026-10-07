import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { getScopedLeadForWorkspace } from "./leadQueue";
import { requireWorkspaceContext } from "./workspace";
import { requireWorkspaceRole } from "./workspace";
import { createDataClient } from "./db";
import { parseDeliveryAddressSnapshot, type DeliveryAddressSnapshot } from "@/lib/deliveryAddress";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = OrderRow["status"];
type OrderSource = OrderRow["order_source"];

export type OrderDTO = Pick<OrderRow, "id" | "workspace_id" | "lead_id" | "product_id" | "agent_id" | "total_amount" | "currency" | "status" | "order_source" | "source_note" | "revision" | "created_at">;

export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreateOrderInput {
  lead_id: string;
  items: CreateOrderItemInput[];
  order_source: OrderSource;
  source_note?: string | null;
  status?: OrderStatus;
  delivery_address_snapshot: DeliveryAddressSnapshot;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus;
  note?: string | null;
}

export interface UpdateOrderDetailsItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface UpdateOrderDetailsInput {
  orderId: string;
  expectedRevision: number;
  items: UpdateOrderDetailsItemInput[];
  order_source: OrderSource;
  source_note?: string | null;
  reason?: string | null;
}

export async function createOrderForWorkspace(
  input: CreateOrderInput,
  workspaceId?: string
): Promise<OrderDTO> {
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) {
    throw new DataAccessError("VALIDATION", "Order must contain between 1 and 50 items");
  }
  if (new Set(input.items.map((item) => item.product_id)).size !== input.items.length) {
    throw new DataAccessError("VALIDATION", "Each product may appear only once in an order");
  }
  for (const item of input.items) {
    if (!item.product_id.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
      throw new DataAccessError("VALIDATION", "Order item quantity must be between 1 and 1000");
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price > 1000000000) {
      throw new DataAccessError("VALIDATION", "Order item unit price must be between 0 and 1000000000");
    }
  }
  if (input.source_note && input.source_note.trim().length > 1000) {
    throw new DataAccessError("VALIDATION", "Order source note is too long");
  }
  const deliveryAddress = parseDeliveryAddressSnapshot(input.delivery_address_snapshot);
  if (!deliveryAddress) {
    throw new DataAccessError("VALIDATION", "A complete delivery address is required.");
  }

  const context = await requireWorkspaceContext(workspaceId);
  const supabase = await createDataClient();

  if (context.role === "operator") {
    await getScopedLeadForWorkspace(input.lead_id, context.workspaceId).catch(() => {
      throw new DataAccessError("VALIDATION", "Order lead is not available in the active workspace");
    });
  }

  const { data, error } = await supabase.rpc("create_order_with_items", {
    p_workspace_id: context.workspaceId,
    p_lead_id: input.lead_id,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    p_order_source: input.order_source,
    p_source_note: input.source_note?.trim() || null,
    p_status: input.status || "completed",
    p_delivery_address_snapshot: deliveryAddress,
  } as never);

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    throw new DataAccessError("DATABASE", "Order creation failed");
  }

  return row as OrderDTO;
}

export async function updateOrderStatusForWorkspace(
  input: UpdateOrderStatusInput,
): Promise<OrderDTO> {
  if (!input.orderId.trim()) {
    throw new DataAccessError("VALIDATION", "Order id is required");
  }
  if (!input.status) {
    throw new DataAccessError("VALIDATION", "Order status is required");
  }
  if (input.note && input.note.trim().length > 500) {
    throw new DataAccessError("VALIDATION", "Order status note is too long");
  }

  const context = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("update_order_status_with_history", {
    p_order_id: input.orderId,
    p_status: input.status,
    p_note: input.note?.trim() || null,
  } as never);

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    const message = error?.message || "Order status update failed";
    if (
      message.includes("not available") ||
      message.includes("Only workspace managers") ||
      message.includes("already has this status") ||
      message.includes("too long") ||
      message.includes("Unsupported order status")
    ) {
      throw new DataAccessError("VALIDATION", message);
    }
    throw new DataAccessError("DATABASE", message);
  }

  if ((row as OrderRow).workspace_id !== context.workspaceId) {
    throw new DataAccessError("FORBIDDEN", "Order is not available in the active workspace");
  }

  return row as OrderDTO;
}

export interface BulkUpdateOrderStatusInput {
  orderIds: string[];
  status: OrderStatus;
  note?: string | null;
}

export interface BulkUpdateOrderStatusResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

export async function bulkUpdateOrderStatusForWorkspace(
  input: BulkUpdateOrderStatusInput,
): Promise<BulkUpdateOrderStatusResult> {
  if (!Array.isArray(input.orderIds) || input.orderIds.length === 0) {
    throw new DataAccessError("VALIDATION", "At least one order must be selected");
  }
  if (input.orderIds.length > 100) {
    throw new DataAccessError("VALIDATION", "Cannot update more than 100 orders at once");
  }
  if (!input.status) {
    throw new DataAccessError("VALIDATION", "Order status is required");
  }

  await requireWorkspaceRole(["team_leader", "administrator"]);

  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  for (const orderId of input.orderIds) {
    try {
      await updateOrderStatusForWorkspace({
        orderId,
        status: input.status,
        note: input.note,
      });
      successCount++;
    } catch (err) {
      failureCount++;
      const message = err instanceof Error ? err.message : `Failed to update order ${orderId}`;
      errors.push(`${orderId}: ${message}`);
    }
  }

  return { successCount, failureCount, errors };
}

function orderDetailsError(error: { message?: string } | null): DataAccessError {
  const message = error?.message || "Order details update failed";
  if (message.includes("changed since it was opened")) {
    return new DataAccessError("VALIDATION", "The order changed since it was opened. Reload and try again.");
  }
  if (message.includes("can no longer be edited") || message.includes("administrator and a reason")) {
    return new DataAccessError("FORBIDDEN", "This order is read-only for your current role and status.");
  }
  if (message.includes("reason") || message.includes("item") || message.includes("source") || message.includes("currency")) {
    return new DataAccessError("VALIDATION", message);
  }
  return new DataAccessError("DATABASE", "Order details update failed");
}

export async function updateOrderDetailsForWorkspace(
  input: UpdateOrderDetailsInput,
): Promise<OrderDTO> {
  if (!input.orderId.trim()) {
    throw new DataAccessError("VALIDATION", "Order id is required");
  }
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
    throw new DataAccessError("VALIDATION", "Order revision is required");
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) {
    throw new DataAccessError("VALIDATION", "Order must contain between 1 and 50 items");
  }
  if (new Set(input.items.map((item) => item.product_id)).size !== input.items.length) {
    throw new DataAccessError("VALIDATION", "Each product may appear only once in an order");
  }
  for (const item of input.items) {
    if (!item.product_id.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
      throw new DataAccessError("VALIDATION", "Order item quantity must be between 1 and 1000");
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price > 1_000_000_000) {
      throw new DataAccessError("VALIDATION", "Order item unit price must be between 0 and 1000000000");
    }
  }
  if (!input.order_source) {
    throw new DataAccessError("VALIDATION", "Order source is required");
  }
  if (input.source_note && input.source_note.trim().length > 1000) {
    throw new DataAccessError("VALIDATION", "Order source note is too long");
  }
  if (input.reason && input.reason.trim().length > 500) {
    throw new DataAccessError("VALIDATION", "Order edit reason is too long");
  }

  const context = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("update_order_with_items", {
    p_order_id: input.orderId,
    p_expected_revision: input.expectedRevision,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    p_order_source: input.order_source,
    p_source_note: input.source_note?.trim() || null,
    p_reason: input.reason?.trim() || null,
  } as never);

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    throw orderDetailsError(error);
  }
  if ((row as OrderRow).workspace_id !== context.workspaceId) {
    throw new DataAccessError("FORBIDDEN", "Order is not available in the active workspace");
  }

  return row as OrderDTO;
}

export interface ReassignOrdersResult {
  sourceProductId: string;
  targetProductId: string;
  movedOrderIds: string[];
}

export async function listOrderProductCountsForWorkspace(
  requestedWorkspaceId?: string
): Promise<Record<string, number>> {
  const { workspaceId } = await requireWorkspaceContext(requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("orders")
    .select("product_id")
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load order product counts.");
  }

  return (data || []).reduce<Record<string, number>>((counts, order) => {
    if (order.product_id) {
      counts[order.product_id] = (counts[order.product_id] || 0) + 1;
    }
    return counts;
  }, {});
}

export async function reassignOrdersProductForWorkspace(
  sourceProductId: string,
  targetProductId: string,
  requestedWorkspaceId?: string
): Promise<ReassignOrdersResult> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);

  if (!sourceProductId.trim() || !targetProductId.trim() || sourceProductId === targetProductId) {
    throw new DataAccessError("VALIDATION", "Source and target products must be different.");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("reassign_orders_product_with_audit", {
    p_workspace_id: workspaceId,
    p_source_product_id: sourceProductId,
    p_target_product_id: targetProductId,
  } as never);

  const row = (Array.isArray(data) ? data[0] : data) as {
    source_product_id: string;
    target_product_id: string;
    moved_order_ids: string[] | null;
  } | null;
  if (error) {
    if (error.message?.includes("must belong to the active workspace")) {
      throw new DataAccessError("VALIDATION", "Both products must belong to the active workspace.");
    }
    throw new DataAccessError("DATABASE", "Unable to reassign the selected orders.");
  }

  if (!row) {
    throw new DataAccessError("DATABASE", "Unable to reassign the selected orders.");
  }

  return {
    sourceProductId: row.source_product_id,
    targetProductId: row.target_product_id,
    movedOrderIds: row.moved_order_ids || [],
  } as ReassignOrdersResult;
}

export interface UpdateOrderTrackingInput {
  orderId: string;
  trackingNumber?: string | null;
  carrier?: string | null;
}

export async function updateOrderTrackingForWorkspace(
  input: UpdateOrderTrackingInput,
  requestedWorkspaceId?: string
): Promise<{ id: string; status: string; tracking_number: string | null; carrier: string | null; revision: number }> {
  if (!input.orderId.trim()) {
    throw new DataAccessError("VALIDATION", "Order id is required");
  }
  if (input.trackingNumber && input.trackingNumber.trim().length > 100) {
    throw new DataAccessError("VALIDATION", "Tracking number is too long");
  }
  if (input.carrier && input.carrier.trim().length > 50) {
    throw new DataAccessError("VALIDATION", "Carrier identifier is too long");
  }

  await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("update_order_tracking", {
    p_order_id: input.orderId,
    p_tracking_number: input.trackingNumber?.trim() || null,
    p_carrier: input.carrier?.trim() || null,
  } as never);

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    const message = error?.message || "Order tracking update failed";
    if (
      message.includes("Only workspace managers") ||
      message.includes("Access forbidden") ||
      message.includes("Order not found")
    ) {
      throw new DataAccessError("VALIDATION", message);
    }
    throw new DataAccessError("DATABASE", message);
  }

  return row as {
    id: string;
    status: string;
    tracking_number: string | null;
    carrier: string | null;
    revision: number;
  };
}

export interface RecordOrderTrackingEventInput {
  orderId: string;
  status?: string | null;
  title: string;
  location?: string | null;
  description?: string | null;
  occurredAt?: string | null;
}

export async function recordOrderTrackingEventForWorkspace(
  input: RecordOrderTrackingEventInput,
  requestedWorkspaceId?: string
): Promise<{
  id: string;
  status: string;
  package_location: string | null;
  tracking_events: unknown;
  revision: number;
}> {
  if (!input.orderId?.trim()) {
    throw new DataAccessError("VALIDATION", "Order id is required");
  }
  if (!input.title?.trim()) {
    throw new DataAccessError("VALIDATION", "Tracking event title is required");
  }

  await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("record_order_tracking_event", {
    p_order_id: input.orderId,
    p_status: input.status?.trim() || null,
    p_title: input.title.trim(),
    p_location: input.location?.trim() || null,
    p_description: input.description?.trim() || null,
    p_occurred_at: input.occurredAt?.trim() || null,
  } as never);

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    const message = error?.message || "Recording tracking event failed";
    if (
      message.includes("Access forbidden") ||
      message.includes("Order not found") ||
      message.includes("Unsupported status transition")
    ) {
      throw new DataAccessError("VALIDATION", message);
    }
    throw new DataAccessError("DATABASE", message);
  }

  return row as {
    id: string;
    status: string;
    package_location: string | null;
    tracking_events: unknown;
    revision: number;
  };
}
