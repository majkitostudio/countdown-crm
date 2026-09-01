import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { getScopedLeadForWorkspace } from "./leadQueue";
import { requireWorkspaceContext, type WorkspaceContext } from "./workspace";
import {
  pageCustomerActivityEvents,
  type CustomerActivityEvent,
  type CustomerActivityPage,
  type CustomerActivityPageOptions,
} from "@/lib/customerActivity";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type OrderStatusHistoryRow = Database["public"]["Tables"]["order_status_history"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadNoteRow = Database["public"]["Tables"]["lead_notes"]["Row"];
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
  revision: number;
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

function previewText(value: string | null | undefined, maxLength = 240): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized;
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
  return listWorkspaceCallsInContext(context, limit);
}

/**
 * Reads calls for a context that was already authorized by the caller.
 * Server-only privileged readers use this to avoid resolving membership twice.
 */
export async function listWorkspaceCallsInContext(
  context: WorkspaceContext,
  limit?: number
): Promise<WorkspaceCallDTO[]> {
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
  return listWorkspaceOrdersInContext(context, limit);
}

/**
 * Reads orders for a context that was already authorized by the caller.
 * Server-only privileged readers use this to avoid resolving membership twice.
 */
export async function listWorkspaceOrdersInContext(
  context: WorkspaceContext,
  limit?: number
): Promise<WorkspaceOrderDTO[]> {
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
    revision: order.revision,
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

async function loadCustomerActivityEvents(
  workspaceId: string,
  leadId: string,
): Promise<CustomerActivityEvent[]> {
  const supabase = await createDataClient();
  const [callsResult, ordersResult, notesResult] = await Promise.all([
    supabase
      .from("calls")
      .select("id, workspace_id, lead_id, agent_id, duration_seconds, outcome, ai_sentiment, created_at")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, workspace_id, lead_id, agent_id, total_amount, currency, order_source, source_note, created_at, products(title), order_items(product_title_snapshot)")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_notes")
      .select("id, workspace_id, lead_id, author_id, body, created_at")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
  ]);

  if (callsResult.error || ordersResult.error || notesResult.error) {
    throw new DataAccessError("DATABASE", "Customer activity query failed");
  }

  const calls = (callsResult.data || []) as CallRow[];
  const orders = (ordersResult.data || []) as unknown as OrderWithProduct[];
  const notes = (notesResult.data || []) as LeadNoteRow[];
  const actorIds = Array.from(new Set([
    ...calls.map((call) => call.agent_id),
    ...orders.map((order) => order.agent_id),
    ...notes.map((note) => note.author_id),
  ].filter((id): id is string => Boolean(id))));

  const profilesResult = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw new DataAccessError("DATABASE", "Customer activity attribution lookup failed");
  }

  const actorNames = new Map(
    ((profilesResult.data || []) as Pick<ProfileRow, "id" | "full_name">[])
      .map((profile) => [profile.id, nameOrUnknown(profile.full_name, "Unknown operator")]),
  );
  const actorNameFor = (actorId: string | null): string =>
    (actorId && actorNames.get(actorId)) || "Unknown operator";

  const callEvents: CustomerActivityEvent[] = calls.map((call) => {
    const duration = call.duration_seconds || 0;
    const sentiment = call.ai_sentiment || "Neutral";
    return {
      id: `call:${call.id}`,
      source_entity_id: call.id,
      workspace_id: workspaceId,
      lead_id: call.lead_id || leadId,
      occurred_at: call.created_at,
      source: "call",
      channel: "voice",
      actor: { id: call.agent_id, display_name: actorNameFor(call.agent_id) },
      preview: {
        title: "Call logged in workspace",
        text: `Duration: ${Math.floor(duration / 60)}m ${duration % 60}s • Outcome: ${call.outcome} • Sentiment: ${sentiment}`,
      },
      metadata: {
        duration_seconds: duration,
        call_outcome: call.outcome,
        sentiment,
      },
    };
  });

  const orderEvents: CustomerActivityEvent[] = orders.map((order) => {
    const productTitle = order.order_items?.[0]?.product_title_snapshot || order.products?.title || "Unknown product";
    const amount = Number(order.total_amount || 0);
    return {
      id: `order:${order.id}`,
      source_entity_id: order.id,
      workspace_id: workspaceId,
      lead_id: order.lead_id || leadId,
      occurred_at: order.created_at,
      source: "order",
      channel: "commerce",
      actor: { id: order.agent_id, display_name: actorNameFor(order.agent_id) },
      preview: {
        title: `Order completed (${amount.toFixed(2)} ${order.currency || "USD"})`,
        text: previewText(`${productTitle}${order.source_note ? ` • ${order.source_note}` : ""}`),
      },
      metadata: {
        amount,
        currency: order.currency || "USD",
        order_source: order.order_source,
      },
    };
  });

  const noteEvents: CustomerActivityEvent[] = notes.map((note) => ({
    id: `lead_note:${note.id}`,
    source_entity_id: note.id,
    workspace_id: workspaceId,
    lead_id: note.lead_id,
    occurred_at: note.created_at,
    source: "lead_note",
    channel: "internal_note",
    actor: { id: note.author_id, display_name: actorNameFor(note.author_id) },
    preview: {
      title: "Operator note",
      text: previewText(note.body),
    },
    metadata: {},
  }));

  return [...callEvents, ...orderEvents, ...noteEvents];
}

export async function listWorkspaceLeadActivityPage(
  leadId: string,
  options: CustomerActivityPageOptions = {},
  requestedWorkspaceId?: string,
): Promise<CustomerActivityPage> {
  if (!leadId?.trim()) {
    throw new DataAccessError("VALIDATION", "Lead id is required");
  }

  const context = await requireWorkspaceContext(requestedWorkspaceId);
  await getScopedLeadForWorkspace(leadId, context.workspaceId);
  const events = await loadCustomerActivityEvents(context.workspaceId, leadId);

  try {
    return pageCustomerActivityEvents(events, options);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid activity cursor") {
      throw new DataAccessError("VALIDATION", error.message);
    }
    throw error;
  }
}
