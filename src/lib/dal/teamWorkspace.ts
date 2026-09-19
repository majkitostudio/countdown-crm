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
import {
  isTeamWorkspacePeriodKey,
  periodBoundsForPeriodKey,
  type TeamWorkspacePeriodKey,
} from "@/lib/teamWorkspaceScope";

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

export interface TeamWorkspaceRecentCall {
  id: string;
  operatorId: string | null;
  outcome: TeamWorkspaceCall["outcome"];
  durationSeconds: number;
  createdAt: string;
}

/** Kolik posledních hovorů se drží v checkpointu pro detail operátora. */
export const TEAM_WORKSPACE_RECENT_CALLS_PER_OPERATOR = 10;

export interface TeamWorkspaceCheckpoint {
  periodKey: TeamWorkspacePeriodKey;
  period: TeamWorkspacePeriod;
  orders: TeamWorkspaceOrderSummary[];
  overdueCallbacks: TeamWorkspaceCallbackSummary[];
  upcomingCallbacks: TeamWorkspaceCallbackSummary[];
  operatorMetrics: TeamWorkspaceOperatorMetrics[];
  recentCallsByOperator: Record<string, TeamWorkspaceRecentCall[]>;
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
  duration_seconds: number | null;
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
    .select("id, agent_id, outcome, duration_seconds, created_at")
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

function mapOverdueCallbacks(callbacks: ScheduledCallbackDTO[], now: Date): TeamWorkspaceCallbackSummary[] {
  return mapCallbackSummaries(callbacks.filter((callback) => Date.parse(callback.scheduled_at) < now.getTime()));
}

function mapUpcomingCallbacks(callbacks: ScheduledCallbackDTO[], now: Date): TeamWorkspaceCallbackSummary[] {
  return mapCallbackSummaries(callbacks.filter((callback) => Date.parse(callback.scheduled_at) >= now.getTime()));
}

function mapCallbackSummaries(callbacks: ScheduledCallbackDTO[]): TeamWorkspaceCallbackSummary[] {
  return callbacks.map((callback) => ({
    id: callback.id,
    leadId: callback.lead_id,
    leadName: callback.lead.full_name,
    scheduledAt: callback.scheduled_at,
    operatorName: callback.preferred_operator?.full_name || null,
  }));
}

function mapRecentCallsByOperator(calls: CallRow[]): Record<string, TeamWorkspaceRecentCall[]> {
  const grouped: Record<string, TeamWorkspaceRecentCall[]> = {};
  for (const call of calls) {
    if (call.agent_id === null) continue;
    const list = grouped[call.agent_id] || [];
    if (list.length >= TEAM_WORKSPACE_RECENT_CALLS_PER_OPERATOR) continue;
    list.push({
      id: call.id,
      operatorId: call.agent_id,
      outcome: call.outcome,
      durationSeconds: Number(call.duration_seconds || 0),
      createdAt: call.created_at,
    });
    grouped[call.agent_id] = list;
  }
  return grouped;
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

export interface TeamWorkspaceCheckpointOptions {
  periodKey?: TeamWorkspacePeriodKey;
  /** Strict subset of the user's selectable operators. Empty means "all". */
  operatorIds?: string[];
  now?: Date;
}

function isInOperatorScope(operatorId: string | null, allowed: Set<string>): boolean {
  return operatorId !== null && allowed.has(operatorId);
}

export async function loadTeamWorkspaceCheckpoint(
  context: WorkspaceContext,
  options: TeamWorkspaceCheckpointOptions = {},
): Promise<TeamWorkspaceCheckpoint> {
  if (!isTeamLeaderOrAdministrator(context.role)) {
    throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
  }

  const now = options.now || new Date();
  const periodKey = options.periodKey && isTeamWorkspacePeriodKey(options.periodKey) ? options.periodKey : "today";
  const period = periodBoundsForPeriodKey(periodKey, now);
  const operatorIds = [...new Set(options.operatorIds || [])];
  const allowedOperators = operatorIds.length ? new Set(operatorIds) : null;

  const operators = (await listWorkspaceOperators(context.workspaceId))
    .filter((operator) => allowedOperators === null || isInOperatorScope(operator.user_id, allowedOperators));
  const overdueWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [ordersResult, callsResult, queueActivitiesResult, telephonyActivitiesResult, overdueCallbacksResult, upcomingCallbacksResult] = await Promise.allSettled([
    loadOrders(context.workspaceId, period),
    loadCalls(context.workspaceId, period),
    loadQueueActivities(context.workspaceId, period),
    loadTelephonyActivities(context.workspaceId, period),
    listScheduledCallbacksForWorkspace(overdueWindowStart, now.toISOString(), context.workspaceId),
    listScheduledCallbacksForWorkspace(now.toISOString(), period.to, context.workspaceId),
  ]);

  const orders = (ordersResult.status === "fulfilled" ? ordersResult.value : [])
    .filter((order) => allowedOperators === null || isInOperatorScope(order.agent_id, allowedOperators));
  const calls = (callsResult.status === "fulfilled" ? callsResult.value : [])
    .filter((call) => allowedOperators === null || isInOperatorScope(call.agent_id, allowedOperators));
  const queueActivities = (queueActivitiesResult.status === "fulfilled" ? queueActivitiesResult.value : [])
    .filter((activity) => allowedOperators === null || isInOperatorScope(activity.assigned_operator_id, allowedOperators));
  const telephonyActivities = (telephonyActivitiesResult.status === "fulfilled" ? telephonyActivitiesResult.value : [])
    .filter((activity) => allowedOperators === null || isInOperatorScope(activity.operator_id, allowedOperators));
  const overdueCallbacks = (overdueCallbacksResult.status === "fulfilled" ? overdueCallbacksResult.value : [])
    .filter((callback) => allowedOperators === null || isInOperatorScope(callback.preferred_operator_id, allowedOperators));
  const upcomingCallbacks = (upcomingCallbacksResult.status === "fulfilled" ? upcomingCallbacksResult.value : [])
    .filter((callback) => allowedOperators === null || isInOperatorScope(callback.preferred_operator_id, allowedOperators));

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
    callbacks: overdueCallbacksResult.status === "fulfilled" && upcomingCallbacksResult.status === "fulfilled"
      ? ready()
      : unavailable("Callbacks could not be fully loaded."),
    activities: queueActivitiesResult.status === "fulfilled" && telephonyActivitiesResult.status === "fulfilled"
      ? ready()
      : unavailable("Talk Time activity could not be fully loaded."),
    shifts: unavailable("Shift planning is not implemented yet."),
  } satisfies TeamWorkspaceCheckpoint["sources"];

  return {
    periodKey,
    period,
    orders: mapOrders(orders, operators),
    overdueCallbacks: mapOverdueCallbacks(overdueCallbacks, now),
    upcomingCallbacks: mapUpcomingCallbacks(upcomingCallbacks, now),
    operatorMetrics: buildTeamWorkspaceOperatorMetrics(metricInput),
    recentCallsByOperator: mapRecentCallsByOperator(calls),
    sources,
  };
}
