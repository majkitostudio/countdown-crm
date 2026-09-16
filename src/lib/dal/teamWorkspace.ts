import "server-only";

import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import {
  buildTeamWorkspaceOperatorMetrics,
  type TeamWorkspaceCall,
  type TeamWorkspaceCallActivity,
  type TeamWorkspaceOperator,
  type TeamWorkspaceOrder,
  type TeamWorkspaceOperatorMetrics,
  type TeamWorkspacePeriod,
} from "@/lib/teamWorkspaceMetrics";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { listScheduledCallbacksForWorkspace, type ScheduledCallbackDTO } from "./leadQueue";
import { listWorkspaceOperators, type WorkspaceMemberDTO } from "./memberships";
import type { WorkspaceContext } from "./workspace";

export type TeamWorkspaceSourceState =
  | { state: "ready" }
  | { state: "unavailable"; message: string };

export interface TeamWorkspaceOrderSummary {
  id: string;
  operatorId: string | null;
  operatorName: string;
  status: TeamWorkspaceOrder["status"];
  source: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

export interface TeamWorkspaceCallbackSummary {
  id: string;
  leadId: string;
  leadName: string;
  scheduledAt: string;
  operatorName: string | null;
}

export interface TeamWorkspaceCheckpoint {
  period: TeamWorkspacePeriod;
  orders: TeamWorkspaceOrderSummary[];
  overdueCallbacks: TeamWorkspaceCallbackSummary[];
  operatorMetrics: TeamWorkspaceOperatorMetrics[];
  sources: {
    orders: TeamWorkspaceSourceState;
    calls: TeamWorkspaceSourceState;
    callbacks: TeamWorkspaceSourceState;
    activities: TeamWorkspaceSourceState;
    shifts: TeamWorkspaceSourceState;
  };
}

type OrderRow = {
  id: string;
  agent_id: string | null;
  status: TeamWorkspaceOrder["status"];
  order_source: string;
  total_amount: number | string | null;
  currency: string | null;
  created_at: string;
};

type CallRow = {
  id: string;
  agent_id: string | null;
  outcome: TeamWorkspaceCall["outcome"];
  created_at: string;
};

type QueueActivityRow = {
  id: string;
  assigned_operator_id: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
};

type TelephonyActivityRow = {
  id: string;
  queue_item_id: string | null;
  operator_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

function utcDayPeriod(now: Date): TeamWorkspacePeriod {
  const date = now.toISOString().slice(0, 10);
  const from = `${date}T00:00:00.000Z`;
  const nextDay = new Date(`${date}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return { from, to: nextDay.toISOString() };
}

function ready(): TeamWorkspaceSourceState {
  return { state: "ready" };
}

function unavailable(message: string): TeamWorkspaceSourceState {
  return { state: "unavailable", message };
}

function databaseMessage(error: unknown, fallback: string): DataAccessError {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;
  return new DataAccessError("DATABASE", message);
}

async function loadOrders(
  workspaceId: string,
  period: TeamWorkspacePeriod,
): Promise<OrderRow[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, agent_id, status, order_source, total_amount, currency, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", period.from)
    .lt("created_at", period.to)
    .order("created_at", { ascending: false });

  if (error) throw databaseMessage(error, "Team orders could not be loaded.");
  return (data || []) as unknown as OrderRow[];
}

async function loadCalls(
  workspaceId: string,
  period: TeamWorkspacePeriod,
): Promise<CallRow[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("calls")
    .select("id, agent_id, outcome, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", period.from)
    .lt("created_at", period.to)
    .order("created_at", { ascending: false });

  if (error) throw databaseMessage(error, "Team calls could not be loaded.");
  return (data || []) as unknown as CallRow[];
}

async function loadQueueActivities(
  workspaceId: string,
  period: TeamWorkspacePeriod,
): Promise<QueueActivityRow[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("lead_queue_items")
    .select("id, assigned_operator_id, call_started_at, call_ended_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", period.from)
    .lt("call_started_at", period.to);

  if (error) throw databaseMessage(error, "Queue call activity could not be loaded.");
  return (data || []) as unknown as QueueActivityRow[];
}

async function loadTelephonyActivities(
  workspaceId: string,
  period: TeamWorkspacePeriod,
): Promise<TelephonyActivityRow[]> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("telephony_call_sessions")
    .select("id, queue_item_id, operator_id, started_at, ended_at, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", period.from)
    .lt("created_at", period.to);

  if (error) throw databaseMessage(error, "Telephony call activity could not be loaded.");
  return (data || []) as unknown as TelephonyActivityRow[];
}

function toOperatorMetricInput(operators: WorkspaceMemberDTO[]): TeamWorkspaceOperator[] {
  return operators.map((operator) => ({
    id: operator.user_id,
    name: operator.full_name || operator.email || "Unknown operator",
  }));
}

function mapActivities(
  queueRows: QueueActivityRow[],
  telephonyRows: TelephonyActivityRow[],
): TeamWorkspaceCallActivity[] {
  const activities = queueRows.map((row) => ({
    id: `queue:${row.id}`,
    operatorId: row.assigned_operator_id,
    startedAt: row.call_started_at,
    endedAt: row.call_ended_at,
  }));
  const queueItemIds = new Set(queueRows.map((row) => row.id));

  for (const row of telephonyRows) {
    if (row.queue_item_id && queueItemIds.has(row.queue_item_id)) continue;
    activities.push({
      id: `telephony:${row.id}`,
      operatorId: row.operator_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
    });
  }

  return activities;
}

function mapCallbacks(callbacks: ScheduledCallbackDTO[], now: Date): TeamWorkspaceCallbackSummary[] {
  return callbacks
    .filter((callback) => Date.parse(callback.scheduled_at) < now.getTime())
    .map((callback) => ({
      id: callback.id,
      leadId: callback.lead_id,
      leadName: callback.lead.full_name,
      scheduledAt: callback.scheduled_at,
      operatorName: callback.preferred_operator?.full_name || null,
    }));
}

function mapOrders(rows: OrderRow[], operators: WorkspaceMemberDTO[]): TeamWorkspaceOrderSummary[] {
  const operatorNames = new Map(operators.map((operator) => [operator.user_id, operator.full_name || operator.email || "Unknown operator"]));
  return rows.map((row) => ({
    id: row.id,
    operatorId: row.agent_id,
    operatorName: row.agent_id ? operatorNames.get(row.agent_id) || "Unknown operator" : "Unassigned",
    status: row.status,
    source: row.order_source,
    totalAmount: Number(row.total_amount || 0),
    currency: row.currency || "—",
    createdAt: row.created_at,
  }));
}

export async function loadTeamWorkspaceCheckpoint(
  context: WorkspaceContext,
  now = new Date(),
): Promise<TeamWorkspaceCheckpoint> {
  if (!isTeamLeaderOrAdministrator(context.role)) {
    throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
  }

  const period = utcDayPeriod(now);
  const operators = await listWorkspaceOperators(context.workspaceId);
  const [ordersResult, callsResult, queueActivitiesResult, telephonyActivitiesResult, callbacksResult] = await Promise.allSettled([
    loadOrders(context.workspaceId, period),
    loadCalls(context.workspaceId, period),
    loadQueueActivities(context.workspaceId, period),
    loadTelephonyActivities(context.workspaceId, period),
    listScheduledCallbacksForWorkspace(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), now.toISOString(), context.workspaceId),
  ]);

  const orders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
  const calls = callsResult.status === "fulfilled" ? callsResult.value : [];
  const queueActivities = queueActivitiesResult.status === "fulfilled" ? queueActivitiesResult.value : [];
  const telephonyActivities = telephonyActivitiesResult.status === "fulfilled" ? telephonyActivitiesResult.value : [];
  const callbacks = callbacksResult.status === "fulfilled" ? callbacksResult.value : [];

  const metricInput = {
    operators: toOperatorMetricInput(operators),
    calls: calls.map((call) => ({
      id: call.id,
      operatorId: call.agent_id,
      occurredAt: call.created_at,
      outcome: call.outcome,
    } satisfies TeamWorkspaceCall)),
    orders: orders.map((order) => ({
      id: order.id,
      operatorId: order.agent_id,
      createdAt: order.created_at,
      status: order.status,
    } satisfies TeamWorkspaceOrder)),
    activities: mapActivities(queueActivities, telephonyActivities),
    shifts: [],
    period,
  };

  const sources = {
    orders: ordersResult.status === "fulfilled" ? ready() : unavailable("New team orders could not be loaded."),
    calls: callsResult.status === "fulfilled" ? ready() : unavailable("Team calls could not be loaded."),
    callbacks: callbacksResult.status === "fulfilled" ? ready() : unavailable("Overdue callbacks could not be loaded."),
    activities: queueActivitiesResult.status === "fulfilled" && telephonyActivitiesResult.status === "fulfilled"
      ? ready()
      : unavailable("Talk Time activity could not be fully loaded."),
    shifts: unavailable("Shift planning is not implemented yet."),
  } satisfies TeamWorkspaceCheckpoint["sources"];

  return {
    period,
    orders: mapOrders(orders, operators),
    overdueCallbacks: mapCallbacks(callbacks, now),
    operatorMetrics: buildTeamWorkspaceOperatorMetrics(metricInput),
    sources,
  };
}
