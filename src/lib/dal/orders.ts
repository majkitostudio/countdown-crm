import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { createDataClient } from "./db";

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
