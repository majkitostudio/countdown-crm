import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceContext } from "./workspace";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type OrderWithProduct = OrderRow & { products?: { title: string } | null };

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
  status: OrderRow["status"];
  created_at: string;
};

type ActivityRows = {
  calls: CallRow[];
  orders: OrderWithProduct[];
  leads: LeadRow[];
  profiles: ProfileRow[];
};

type ActivityQueryOptions = {
  workspaceId: string;
  leadId?: string;
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
  limit?: number
): Promise<ActivityRows> {
  const supabase = await createDataClient();

  const callsQuery = includeCalls
    ? fetchCalls(supabase, { workspaceId, leadId, limit })
    : Promise.resolve({ data: [], error: null });
  const ordersQuery = includeOrders
    ? fetchOrders(supabase, { workspaceId, leadId, limit })
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
    .select("*, products(title)")
    .eq("workspace_id", options.workspaceId);

  if (options.leadId) query = query.eq("lead_id", options.leadId);

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

export async function listWorkspaceOrders(
  requestedWorkspaceId?: string,
  limit?: number
): Promise<WorkspaceOrderDTO[]> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const rows = await loadActivityRows(context.workspaceId, undefined, false, true, limit);
  const { customerNameFor, operatorNameFor } = buildLookups(rows);

  return rows.orders.map((order) => ({
    id: order.id,
    lead_id: order.lead_id || "",
    lead_name: customerNameFor(order.lead_id),
    product_id: order.product_id || "",
    product_title: order.products?.title || "Unknown product",
    agent_id: order.agent_id,
    agent_name: operatorNameFor(order.agent_id),
    total_amount: Number(order.total_amount || 0),
    status: order.status,
    created_at: order.created_at,
  }));
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
    orders: rows.orders.map((order) => ({
      id: order.id,
      lead_id: order.lead_id || leadId,
      lead_name: customerNameFor(order.lead_id),
      product_id: order.product_id || "",
      product_title: order.products?.title || "Unknown product",
      agent_id: order.agent_id,
      agent_name: operatorNameFor(order.agent_id),
      total_amount: Number(order.total_amount || 0),
      status: order.status,
      created_at: order.created_at,
    })),
  };
}
