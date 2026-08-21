import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { getScopedLeadForWorkspace } from "./leadQueue";
import { requireWorkspaceContext } from "./workspace";
import { requireWorkspaceRole } from "./workspace";
import { createDataClient } from "./db";
import { createAuditLogForWorkspace } from "./audit";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = OrderRow["status"];
type OrderSource = OrderRow["order_source"];

export type OrderDTO = Pick<OrderRow, "id" | "workspace_id" | "lead_id" | "product_id" | "agent_id" | "total_amount" | "currency" | "status" | "order_source" | "source_note" | "created_at">;

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
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus;
  note?: string | null;
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
    throw new DataAccessError("DATABASE", "Order status update failed");
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
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, title")
    .eq("workspace_id", workspaceId)
    .in("id", [sourceProductId, targetProductId]);

  if (productError) {
    throw new DataAccessError("DATABASE", "Unable to verify the selected products.");
  }

  const sourceProduct = products?.find((product) => product.id === sourceProductId);
  const targetProduct = products?.find((product) => product.id === targetProductId);
  if (!sourceProduct || !targetProduct) {
    throw new DataAccessError("VALIDATION", "Both products must belong to the active workspace.");
  }

  const { data: orders, error: orderLookupError } = await supabase
    .from("orders")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("product_id", sourceProductId);

  if (orderLookupError) {
    throw new DataAccessError("DATABASE", "Unable to load orders for product reassignment.");
  }

  const orderIds = (orders || []).map((order) => order.id);
  if (orderIds.length === 0) {
    return { sourceProductId, targetProductId, movedOrderIds: [] };
  }

  const { data: updatedOrders, error: updateError } = await supabase
    .from("orders")
    .update({ product_id: targetProductId })
    .eq("workspace_id", workspaceId)
    .eq("product_id", sourceProductId)
    .select("id");

  if (updateError || !updatedOrders) {
    throw new DataAccessError("DATABASE", "Unable to reassign the selected orders.");
  }

  const movedOrderIds = updatedOrders.map((order) => order.id);
  await createAuditLogForWorkspace({
    action: "ORDER_PRODUCT_REASSIGNED",
    severity: "medium",
    details: `Reassigned ${movedOrderIds.length} order(s) from ${sourceProduct.title} to ${targetProduct.title}. Historical order totals were preserved.`,
  });

  return { sourceProductId, targetProductId, movedOrderIds };
}
