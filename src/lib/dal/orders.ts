import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { requireWorkspaceContext } from "./workspace";
import { createDataClient } from "./db";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = OrderRow["status"];

export type OrderDTO = Pick<OrderRow, "id" | "workspace_id" | "lead_id" | "product_id" | "total_amount" | "status" | "created_at">;

export interface CreateOrderInput {
  lead_id?: string | null;
  product_id?: string | null;
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

  if (input.lead_id || input.product_id) {
    const [leadResult, productResult] = await Promise.all([
      input.lead_id
        ? supabase.from("leads").select("id").eq("id", input.lead_id).eq("workspace_id", context.workspaceId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      input.product_id
        ? supabase.from("products").select("id").eq("id", input.product_id).eq("workspace_id", context.workspaceId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (leadResult.error || productResult.error) {
      throw new DataAccessError("DATABASE", "Order relation lookup failed");
    }
    if ((input.lead_id && !leadResult.data) || (input.product_id && !productResult.data)) {
      throw new DataAccessError("VALIDATION", "Order relation does not belong to workspace");
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      workspace_id: context.workspaceId,
      lead_id: input.lead_id || null,
      product_id: input.product_id || null,
      total_amount: input.total_amount,
      status: input.status || "completed",
    })
    .select("id, workspace_id, lead_id, product_id, total_amount, status, created_at")
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Order creation failed");
  }

  return data as OrderDTO;
}
