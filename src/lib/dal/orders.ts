import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { requireWorkspaceRole } from "./workspace";
import { createDataClient } from "./db";
import { createAuditLogForWorkspace } from "./audit";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = OrderRow["status"];
type OrderSource = OrderRow["order_source"];

export type OrderDTO = Pick<OrderRow, "id" | "workspace_id" | "lead_id" | "product_id" | "agent_id" | "total_amount" | "status" | "order_source" | "source_note" | "created_at">;

export interface CreateOrderInput {
  lead_id: string;
  product_id: string;
  total_amount: number;
  order_source: OrderSource;
  source_note?: string | null;
  status?: OrderStatus;
}

export async function createOrderForWorkspace(
  input: CreateOrderInput,
  workspaceId?: string
): Promise<OrderDTO> {
  if (!Number.isFinite(input.total_amount) || input.total_amount < 0) {
    throw new DataAccessError("VALIDATION", "Order amount must be a non-negative number");
  }
  if (input.source_note && input.source_note.trim().length > 1000) {
    throw new DataAccessError("VALIDATION", "Order source note is too long");
  }

  const context = await requireWorkspaceContext(workspaceId);
  const supabase = await createDataClient();

  const [leadResult, productResult] = await Promise.all([
    supabase.from("leads").select("id").eq("id", input.lead_id).eq("workspace_id", context.workspaceId).maybeSingle(),
    supabase.from("products").select("id").eq("id", input.product_id).eq("workspace_id", context.workspaceId).maybeSingle(),
  ]);

  if (leadResult.error || productResult.error) {
    throw new DataAccessError("DATABASE", "Order relation lookup failed");
  }
  if (!leadResult.data || !productResult.data) {
    throw new DataAccessError("VALIDATION", "Order requires valid lead and product in the active workspace");
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      workspace_id: context.workspaceId,
      lead_id: input.lead_id,
      product_id: input.product_id,
      agent_id: context.userId,
      total_amount: input.total_amount,
      status: input.status || "completed",
      order_source: input.order_source,
      source_note: input.source_note?.trim() || null,
    })
    .select("id, workspace_id, lead_id, product_id, agent_id, total_amount, status, order_source, source_note, created_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Order creation failed");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", context.userId)
    .maybeSingle();

  if (profileError) {
    throw new DataAccessError("DATABASE", "Order audit operator lookup failed");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    workspace_id: context.workspaceId,
    actor_id: context.userId,
    actor_name: profile?.full_name?.trim() || "Unknown operator",
    action: "ORDER_CREATED_MANUAL",
    target_resource: "Order",
    details: `Order ${data.id} created from ${input.order_source}${input.source_note?.trim() ? `: ${input.source_note.trim()}` : ""}`,
    severity: "low",
    ip_address: "server",
  });

  if (auditError) {
    throw new DataAccessError("DATABASE", "Order was created but the audit event was not saved");
  }

  return data as OrderDTO;
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
