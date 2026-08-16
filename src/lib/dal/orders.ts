import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { createDataClient } from "./db";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = OrderRow["status"];

export type OrderDTO = Pick<OrderRow, "id" | "workspace_id" | "lead_id" | "product_id" | "agent_id" | "total_amount" | "status" | "created_at">;

export interface CreateOrderInput {
  lead_id: string;
  product_id: string;
  total_amount: number;
  status?: OrderStatus;
}

export async function createOrderForWorkspace(
  input: CreateOrderInput,
  workspaceId?: string
): Promise<OrderDTO> {
  if (!Number.isFinite(input.total_amount) || input.total_amount < 0) {
    throw new DataAccessError("VALIDATION", "Order amount must be a non-negative number");
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
    })
    .select("id, workspace_id, lead_id, product_id, agent_id, total_amount, status, created_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Order creation failed");
  }

  return data as OrderDTO;
}
