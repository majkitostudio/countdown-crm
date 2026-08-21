import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { getScopedLeadForWorkspace } from "./leadQueue";
import { requireWorkspaceContext } from "./workspace";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type OrderStatusHistoryRow = Database["public"]["Tables"]["order_status_history"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type OrderWithProduct = OrderRow & { products?: { title: string } | null; order_items?: OrderItemRow[] | null };

export type WorkspaceCallDTO = {
  id: string;
  lead_id: string;
  lead_name: string;
  agent_id: string | null;
  agent_name: string;
  duration_seconds: number;
  outcome: CallRow["outcome"];
  sentiment: string;
  order_value: number;
  transcript: string | null;
  created_at: string;
};

export type WorkspaceOrderDTO = {
  id: string;
  lead_id: string;
  lead_name: string;
  product_id: string;
  product_title: string;
  agent_id: string | null;
  agent_name: string;
  total_amount: number;
  currency: string;
  items: WorkspaceOrderItemDTO[];
  status: OrderRow["status"];
  order_source: OrderRow["order_source"];
  source_note: string | null;
  status_history: WorkspaceOrderStatusHistoryDTO[];
  created_at: string;
};

export type WorkspaceOrderItemDTO = {
  id: string;
  product_id: string;
  product_title: string;
  unit_price: number;
  minimum_unit_price: number;
  quantity: number;
  line_total: number;
  currency: string;
};

export type WorkspaceOrderStatusHistoryDTO = Pick<
  OrderStatusHistoryRow,
  "id" | "from_status" | "to_status" | "actor_id" | "actor_name" | "note" | "created_at"
>;

type ActivityRows = {
  calls: CallRow[];
  orders: OrderWithProduct[];
  leads: LeadRow[];
  profiles: ProfileRow[];
};

type ActivityQueryOptions = {
  workspaceId: string;
  leadId?: string;
  callId?: string;
  orderId?: string;
  limit?: number;
};

function nameOrUnknown(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

async function loadActivityRows(
  workspaceId: string,
  leadId?: string,
  includeCalls = true,
  includeOrders = true,
  limit?: number,
  callId?: string,
  orderId?: string,
): Promise<ActivityRows> {
  const supabase = await createDataClient();

  const callsQuery = includeCalls
    ? fetchCalls(supabase, { workspaceId, leadId, callId, limit })
    : Promise.resolve({ data: [], error: null });
  const ordersQuery = includeOrders
    ? fetchOrders(supabase, { workspaceId, leadId, orderId, limit })
    : Promise.resolve({ data: [], error: null });

  const [callsResult, ordersResult] = await Promise.all([callsQuery, ordersQuery]);

  if (callsResult.error || ordersResult.error) {
    throw new DataAccessError("DATABASE", "Workspace activity query failed");
  }

  const calls = (callsResult.data || []) as CallRow[];
  const orders = (ordersResult.data || []) as unknown as OrderWithProduct[];
  const leadIds = Array.from(
    new Set(
      [...calls, ...orders]
        .map((entry) => entry.lead_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const agentIds = Array.from(
    new Set(
      [...calls, ...orders]
        .map((entry) => entry.agent_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [leadsQuery, profilesQuery] = await Promise.all([
    leadIds.length
      ? supabase.from("leads").select("*").eq("workspace_id", workspaceId).in("id", leadIds)
      : Promise.resolve({ data: [], error: null }),
    agentIds.length
      ? supabase.from("profiles").select("*").in("id", agentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (leadsQuery.error || profilesQuery.error) {
    throw new DataAccessError("DATABASE", "Workspace activity attribution lookup failed");
  }

  return {
    calls,
    orders,
    leads: (leadsQuery.data || []) as LeadRow[],
    profiles: (profilesQuery.data || []) as ProfileRow[],
  };
}

async function fetchCalls(
  supabase: SupabaseClient,
  options: ActivityQueryOptions
) {
  let query = supabase
    .from("calls")
    .select("*")
    .eq("workspace_id", options.workspaceId);

  if (options.leadId) query = query.eq("lead_id", options.leadId);
  if (options.callId) query = query.eq("id", options.callId);

  query = query.order("created_at", { ascending: false });
  if (options.limit !== undefined) query = query.limit(options.limit);

  return query;
}

async function fetchOrders(
  supabase: SupabaseClient,
  options: ActivityQueryOptions
) {
  let query = supabase
    .from("orders")
    .select("*, products(title), order_items(id, product_id, product_title_snapshot, unit_price, minimum_unit_price, quantity, line_total, currency)")
    .eq("workspace_id", options.workspaceId);

  if (options.leadId) query = query.eq("lead_id", options.leadId);
  if (options.orderId) query = query.eq("id", options.orderId);

  query = query.order("created_at", { ascending: false });
  if (options.limit !== undefined) query = query.limit(options.limit);

  return query;
}

function buildLookups(rows: ActivityRows) {
  const leadNames = new Map(
    rows.leads.map((lead) => [lead.id, nameOrUnknown(lead.full_name, "Unknown customer")])
  );
  const operatorNames = new Map(
    rows.profiles.map((profile) => [profile.id, nameOrUnknown(profile.full_name, "Unknown operator")])
  );

  return {
    customerNameFor: (leadId: string | null) =>
      (leadId && leadNames.get(leadId)) || "Unknown customer",
    operatorNameFor: (agentId: string | null) =>
      (agentId && operatorNames.get(agentId)) || "Unknown operator",
  };
}

export async function listWorkspaceCalls(
  requestedWorkspaceId?: string,
  limit?: number
): Promise<WorkspaceCallDTO[]> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const rows = await loadActivityRows(context.workspaceId, undefined, true, false, limit);
  const { customerNameFor, operatorNameFor } = buildLookups(rows);

  return rows.calls.map((call) => ({
    id: call.id,
    lead_id: call.lead_id || "",
    lead_name: customerNameFor(call.lead_id),
    agent_id: call.agent_id,
    agent_name: operatorNameFor(call.agent_id),
    duration_seconds: call.duration_seconds || 0,
    outcome: call.outcome,
    sentiment: call.ai_sentiment || "Neutral",
    order_value: 0,
    transcript: call.transcript,
    created_at: call.created_at,
  }));
}

export async function getWorkspaceCall(
  callId: string,
  requestedWorkspaceId?: string
): Promise<WorkspaceCallDTO | null> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const rows = await loadActivityRows(context.workspaceId, undefined, true, false, undefined, callId);
  const call = rows.calls[0];
  if (!call) return null;

  const { customerNameFor, operatorNameFor } = buildLookups(rows);
  return {
    id: call.id,
    lead_id: call.lead_id || "",
    lead_name: customerNameFor(call.lead_id),
    agent_id: call.agent_id,
    agent_name: operatorNameFor(call.agent_id),
    duration_seconds: call.duration_seconds || 0,
    outcome: call.outcome,
    sentiment: call.ai_sentiment || "Neutral",
    order_value: 0,
    transcript: call.transcript,
    created_at: call.created_at,
  };
}

export async function listWorkspaceOrders(
  requestedWorkspaceId?: string,
  limit?: number
): Promise<WorkspaceOrderDTO[]> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const rows = await loadActivityRows(context.workspaceId, undefined, false, true, limit);
  const { customerNameFor, operatorNameFor } = buildLookups(rows);

  return rows.orders.map((order) => toWorkspaceOrderDTO(order, customerNameFor(order.lead_id), operatorNameFor(order.agent_id)));
}

export async function getWorkspaceOrder(
  orderId: string,
  requestedWorkspaceId?: string,
): Promise<WorkspaceOrderDTO | null> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const rows = await loadActivityRows(context.workspaceId, undefined, false, true, undefined, undefined, orderId);
  const order = rows.orders[0];
  if (!order) return null;

  const { customerNameFor, operatorNameFor } = buildLookups(rows);
  let leadName = customerNameFor(order.lead_id);
  if (context.role === "operator" && order.lead_id) {
    try {
      const scopedLead = await getScopedLeadForWorkspace(order.lead_id, context.workspaceId);
      leadName = scopedLead.full_name;
    } catch {
      // Keep the explicit unavailable state when the lead is no longer the operator's assignment.
    }
  }

  const supabase = await createDataClient();
  const { data: history, error: historyError } = await supabase
    .from("order_status_history")
    .select("id, from_status, to_status, actor_id, actor_name, note, created_at")
    .eq("workspace_id", context.workspaceId)
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (historyError) {
    throw new DataAccessError("DATABASE", "Order status history query failed");
  }

  return toWorkspaceOrderDTO(order, leadName, operatorNameFor(order.agent_id), (history || []) as OrderStatusHistoryRow[]);
}

function orderItemsFor(order: OrderWithProduct): WorkspaceOrderItemDTO[] {
  return (order.order_items || []).map((item) => ({
    id: item.id,
    product_id: item.product_id,
    product_title: item.product_title_snapshot,
    unit_price: Number(item.unit_price || 0),
    minimum_unit_price: Number(item.minimum_unit_price || 0),
    quantity: item.quantity,
    line_total: Number(item.line_total || 0),
    currency: item.currency,
  }));
}

function toWorkspaceOrderDTO(
  order: OrderWithProduct,
  leadName: string,
  operatorName: string,
  statusHistory: OrderStatusHistoryRow[] = [],
): WorkspaceOrderDTO {
  const items = orderItemsFor(order);
  return {
    id: order.id,
    lead_id: order.lead_id || "",
    lead_name: leadName,
    product_id: order.product_id || items[0]?.product_id || "",
    product_title: items[0]?.product_title || order.products?.title || "Unknown product",
    agent_id: order.agent_id,
    agent_name: operatorName,
    total_amount: Number(order.total_amount || 0),
    currency: order.currency || items[0]?.currency || "USD",
    items,
    status: order.status,
    order_source: order.order_source,
    source_note: order.source_note,
    status_history: statusHistory.map((entry) => ({
      id: entry.id,
      from_status: entry.from_status,
      to_status: entry.to_status,
      actor_id: entry.actor_id,
      actor_name: entry.actor_name,
      note: entry.note,
      created_at: entry.created_at,
    })),
    created_at: order.created_at,
  };
}

export async function listWorkspaceOrdersForLead(
  leadId: string,
  requestedWorkspaceId?: string
): Promise<WorkspaceOrderDTO[]> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const rows = await loadActivityRows(context.workspaceId, leadId, false, true);
  const { customerNameFor, operatorNameFor } = buildLookups(rows);

  return rows.orders.map((order) => toWorkspaceOrderDTO(order, customerNameFor(order.lead_id) || leadId, operatorNameFor(order.agent_id)));
}

export async function listWorkspaceLeadActivity(
  leadId: string,
  requestedWorkspaceId?: string
): Promise<{ calls: WorkspaceCallDTO[]; orders: WorkspaceOrderDTO[] }> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const rows = await loadActivityRows(context.workspaceId, leadId);
  const { customerNameFor, operatorNameFor } = buildLookups(rows);

  return {
    calls: rows.calls.map((call) => ({
      id: call.id,
      lead_id: call.lead_id || leadId,
      lead_name: customerNameFor(call.lead_id),
      agent_id: call.agent_id,
      agent_name: operatorNameFor(call.agent_id),
      duration_seconds: call.duration_seconds || 0,
      outcome: call.outcome,
      sentiment: call.ai_sentiment || "Neutral",
      order_value: 0,
      transcript: call.transcript,
      created_at: call.created_at,
    })),
    orders: rows.orders.map((order) => toWorkspaceOrderDTO(order, customerNameFor(order.lead_id) || leadId, operatorNameFor(order.agent_id))),
  };
}
