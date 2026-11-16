import "server-only";

import type { Database } from "./supabase/types";
import { createDataClient } from "./dal/db";
import { requireWorkspaceRole } from "./dal/workspace";
import { listWorkspaceCallsInContext, listWorkspaceOrdersInContext } from "./dal/activity";
import { getWorkspaceRoleLabel } from "./auth/roles";
import { getDailyTeamSummary, type DailyTeamSummary } from "./dailyTeamSummary";
import { getCallActivity, type CallActivityOverview } from "./callActivity";
import { aggregateCurrencyAmounts, isRecordedAmount, singleCurrency, type CurrencyAmount } from "./currency";

export const ANALYTICS_ALLOWED_ROLES = ["team_leader", "administrator"] as const;

export type AnalyticsActionErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "UNAVAILABLE";

export interface AnalyticsActionFailure {
  ok: false;
  code: AnalyticsActionErrorCode;
  status: 400 | 401 | 403 | 503;
  message: string;
}

export interface AnalyticsActionSuccess<T> {
  ok: true;
  data: T;
}

export type AnalyticsActionResult<T> = AnalyticsActionSuccess<T> | AnalyticsActionFailure;

export interface WeeklySalesPoint {
  day: string;
  revenue: number | null;
  revenueByCurrency: CurrencyAmount[];
  currency: string | null;
  forecast: number;
}

export interface ObjectionCategoryPoint {
  name: string;
  count: number;
  percentage: number;
}

export interface AgentLeaderboardPoint {
  agentName: string;
  role: string;
  callsCount: number;
  ordersCount: number;
  ordersWithoutCurrencyCount: number;
  ordersWithoutAmountCount: number;
  revenueGenerated: number | null;
  revenueByCurrency: CurrencyAmount[];
  revenueCurrency: string | null;
  conversionRate: number;
}

export interface AnalyticsTeamScope {
  id: string;
  name: string;
}

export interface AnalyticsOverview {
  scope: "team" | "workspace";
  scopeLabel: "Moje týmy" | "Celý pracovní prostor";
  accessibleTeams: AnalyticsTeamScope[];
  sources: {
    calls: "ready" | "unavailable";
    orders: "ready" | "unavailable";
    operators: "ready" | "unavailable";
    teams: "ready" | "unavailable";
  };
  totalRevenue: number | null;
  revenueByCurrency: CurrencyAmount[];
  completedOrdersCount: number;
  completedOrdersWithoutCurrencyCount: number;
  completedOrdersWithoutAmountCount: number;
  projectedRevenue: number;
  forecastGrowthPercent: number;
  forecastAvailable: boolean;
  avgOrderValue: number | null;
  avgOrderValueByCurrency: CurrencyAmount[];
  currencies: string[];
  totalCalls: number;
  conversionRate: number;
  conversionAvailable: boolean;
  objectionResolutionRate: number | null;
  objectionMetricsAvailable: boolean;
  weeklySales: WeeklySalesPoint[];
  objectionBreakdown: ObjectionCategoryPoint[];
  teamLeaderboard: AgentLeaderboardPoint[];
  teamMetricsAvailable: boolean;
  daily: DailyTeamSummary;
  callActivity: CallActivityOverview;
}

export interface RecentActivityEntry {
  id: string;
  type: "call" | "order";
  timestamp: string;
  customerName: string;
  operatorName: string;
  durationSeconds?: number;
  outcome: string;
  sentiment?: string | null;
  productName?: string;
  amount?: number;
  currency?: string;
}

export interface RecentActivityResult {
  entries: RecentActivityEntry[];
  sources: { calls: "ready" | "unavailable"; orders: "ready" | "unavailable" };
}

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type CallRow = Database["public"]["Tables"]["calls"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function getWeeklySales(orders: OrderRow[]): WeeklySalesPoint[] {
  const today = new Date();
  const points: WeeklySalesPoint[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - offset);
    const dateKey = date.toISOString().slice(0, 10);
    const dayOrders = orders.filter((order) => order.created_at.slice(0, 10) === dateKey && order.status === "completed");
    const completeDayOrders = dayOrders.filter(
      (order) => isRecordedAmount(order.total_amount) && Boolean(order.currency?.trim()),
    );
    const revenueByCurrency = aggregateCurrencyAmounts(
      completeDayOrders,
      (order) => Number(order.total_amount),
      (order) => order.currency,
    );
    const hasMissingCurrency = dayOrders.some((order) => !order.currency?.trim());
    const hasMissingAmount = dayOrders.some((order) => !isRecordedAmount(order.total_amount));
    const dayCurrencies = new Set(
      dayOrders
        .map((order) => order.currency?.trim().toUpperCase())
        .filter((value): value is string => Boolean(value)),
    );
    const currency = dayCurrencies.size === 1 ? Array.from(dayCurrencies)[0] ?? null : null;

    points.push({
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      revenue: dayOrders.length === 0
        ? 0
        : currency && !hasMissingCurrency && !hasMissingAmount
          ? revenueByCurrency[0]?.amount ?? 0
          : null,
      revenueByCurrency,
      currency,
      forecast: 0,
    });
  }

  return points;
}

function getTeamLeaderboard(
  calls: CallRow[],
  orders: OrderRow[],
  profiles: ProfileRow[]
): AgentLeaderboardPoint[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const statsByAgent = new Map<string, {
    callsCount: number;
    ordersCount: number;
    ordersWithoutCurrencyCount: number;
    ordersWithoutAmountCount: number;
    revenueByCurrency: Map<string, number>;
  }>();

  const ensureAgent = (agentId: string) => {
    const current = statsByAgent.get(agentId);
    if (current) return current;
    const empty = {
      callsCount: 0,
      ordersCount: 0,
      ordersWithoutCurrencyCount: 0,
      ordersWithoutAmountCount: 0,
      revenueByCurrency: new Map<string, number>(),
    };
    statsByAgent.set(agentId, empty);
    return empty;
  };

  calls.forEach((call) => {
    if (!call.agent_id) return;
    ensureAgent(call.agent_id).callsCount += 1;
  });

  orders.forEach((order) => {
    if (!order.agent_id || order.status !== "completed") return;
    const stats = ensureAgent(order.agent_id);
    stats.ordersCount += 1;
    const currency = order.currency?.trim().toUpperCase();
    if (!currency) {
      stats.ordersWithoutCurrencyCount += 1;
    }
    if (!isRecordedAmount(order.total_amount)) stats.ordersWithoutAmountCount += 1;
    if (!currency || !isRecordedAmount(order.total_amount)) return;
    stats.revenueByCurrency.set(currency, (stats.revenueByCurrency.get(currency) || 0) + Number(order.total_amount));
  });

  return Array.from(statsByAgent.entries())
    .map(([agentId, stats]) => {
      const profile = profileById.get(agentId);
      const agentName = profile?.full_name?.trim() || "Neznámý operátor";
      const role = profile?.role ? getWorkspaceRoleLabel(profile.role) : "Role není dostupná";
      const revenueByCurrency = Array.from(stats.revenueByCurrency.entries())
        .map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }))
        .sort((left, right) => left.currency.localeCompare(right.currency));
      const revenueCurrency = singleCurrency(revenueByCurrency);

      return {
        agentName,
        role,
        callsCount: stats.callsCount,
        ordersCount: stats.ordersCount,
        ordersWithoutCurrencyCount: stats.ordersWithoutCurrencyCount,
        ordersWithoutAmountCount: stats.ordersWithoutAmountCount,
        revenueGenerated: revenueCurrency && stats.ordersWithoutCurrencyCount === 0 && stats.ordersWithoutAmountCount === 0
          ? revenueByCurrency[0].amount
          : null,
        revenueByCurrency,
        revenueCurrency,
        conversionRate: stats.callsCount > 0
          ? Math.round((stats.ordersCount / stats.callsCount) * 1000) / 10
          : 0,
      };
    })
    .sort((a, b) => {
      if (b.ordersCount !== a.ordersCount) {
        return b.ordersCount - a.ordersCount;
      }
      if (b.callsCount !== a.callsCount) return b.callsCount - a.callsCount;
      return a.agentName.localeCompare(b.agentName);
    });
}

/** Retrieves recent workspace activity with real customer and operator attribution. */
export async function getRecentActivity(limit = 8, requestedWorkspaceId?: string): Promise<RecentActivityResult> {
  const context = await requireWorkspaceRole(ANALYTICS_ALLOWED_ROLES, requestedWorkspaceId);
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const [callsResult, ordersResult] = await Promise.allSettled([
    listWorkspaceCallsInContext(context, safeLimit),
    listWorkspaceOrdersInContext(context, safeLimit),
  ]);

  const calls = callsResult.status === "fulfilled" ? callsResult.value : [];
  const orders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
  const entries: RecentActivityEntry[] = [
    ...calls.map((call) => ({
      id: `call-${call.id}`,
      type: "call" as const,
      timestamp: call.created_at,
      customerName: call.lead_name,
      operatorName: call.agent_name,
      durationSeconds: call.duration_seconds ?? undefined,
      outcome: call.outcome,
      sentiment: call.sentiment,
    })),
    ...orders.map((order) => ({
      id: `order-${order.id}`,
      type: "order" as const,
      timestamp: order.created_at,
      customerName: order.lead_name,
      operatorName: order.agent_name,
      outcome: order.status,
      productName: order.product_title,
      amount: order.total_amount ?? undefined,
      currency: order.currency ?? undefined,
    })),
  ];

  return {
    entries: entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, safeLimit),
    sources: { calls: callsResult.status === "fulfilled" ? "ready" : "unavailable", orders: ordersResult.status === "fulfilled" ? "ready" : "unavailable" },
  };
}

/** Retrieves analytics using the role's server-authorized team scope. */
export async function getAnalyticsData(requestedWorkspaceId?: string): Promise<AnalyticsOverview> {
  const context = await requireWorkspaceRole(ANALYTICS_ALLOWED_ROLES, requestedWorkspaceId);
  const supabase = await createDataClient();
  const scope = context.role === "administrator" ? "workspace" : "team";
  const scopeLabel = scope === "workspace" ? "Celý pracovní prostor" : "Moje týmy";

  // This query is filtered by RLS as well as the workspace condition. For a
  // Team Leader it gives us the names and IDs that may be shown in the UI.
  const teamsRes = await supabase
    .from("teams")
    .select("id, name")
    .eq("workspace_id", context.workspaceId);
  const teamsAvailable = !teamsRes.error;
  const accessibleTeams = teamsAvailable
    ? (teamsRes.data || []).map((team) => ({ id: team.id, name: team.name }))
    : [];
  const accessibleTeamIds = accessibleTeams.map((team) => team.id);

  // The server-side team filter is an additional safety and performance
  // measure. RLS remains the actual authorization boundary for every row.
  const loadOrders = () => {
    if (context.role === "team_leader" && teamsAvailable && accessibleTeamIds.length === 0) {
      return Promise.resolve({ data: [], error: null });
    }

    let query = supabase.from("orders").select("*").eq("workspace_id", context.workspaceId);
    if (context.role === "team_leader" && teamsAvailable) {
      query = query.in("team_id", accessibleTeamIds);
    }
    return query;
  };

  const loadCalls = () => {
    if (context.role === "team_leader" && teamsAvailable && accessibleTeamIds.length === 0) {
      return Promise.resolve({ data: [], error: null });
    }

    let query = supabase.from("calls").select("*").eq("workspace_id", context.workspaceId);
    if (context.role === "team_leader" && teamsAvailable) {
      query = query.in("team_id", accessibleTeamIds);
    }
    return query;
  };

  const [ordersRes, callsRes] = await Promise.all([loadOrders(), loadCalls()]);

  const ordersAvailable = !ordersRes.error;
  const callsAvailable = !callsRes.error;
  const orders = ordersAvailable ? (ordersRes.data || []) as OrderRow[] : [];
  const calls = callsAvailable ? (callsRes.data || []) as CallRow[] : [];
  const agentIds = Array.from(
    new Set(
      [...calls, ...orders]
        .map((entry) => entry.agent_id)
        .filter((agentId): agentId is string => Boolean(agentId))
    )
  );
  const { data: profileRows, error: profilesError } = agentIds.length
    ? await supabase.from("profiles").select("id, full_name, email, role, status, avatar_url, created_at, updated_at").in("id", agentIds)
    : { data: [], error: null };

  const operatorsAvailable = !profilesError;
  const profiles = operatorsAvailable ? profileRows as ProfileRow[] : [];
  const completedOrders = orders.filter((order) => order.status === "completed");
  const completedOrdersWithoutCurrencyCount = completedOrders.filter((order) => !order.currency?.trim()).length;
  const completedOrdersWithoutAmountCount = completedOrders.filter((order) => !isRecordedAmount(order.total_amount)).length;
  const completeOrders = completedOrders.filter(
    (order) => isRecordedAmount(order.total_amount) && Boolean(order.currency?.trim()),
  );
  const revenueByCurrency = aggregateCurrencyAmounts(
    completeOrders,
    (order) => Number(order.total_amount),
    (order) => order.currency,
  );
  const currencies = Array.from(
    new Set(
      completedOrders
        .map((order) => order.currency?.trim().toUpperCase())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
  const currency = currencies.length === 1 ? currencies[0] ?? null : null;
  const totalRevenue = !ordersAvailable
    ? null
    : completedOrders.length === 0
      ? 0
      : currency && completedOrdersWithoutCurrencyCount === 0 && completedOrdersWithoutAmountCount === 0
        ? revenueByCurrency[0]?.amount ?? null
        : null;
  const avgOrderValueByCurrency = revenueByCurrency.map((entry) => ({
    currency: entry.currency,
    amount: Math.round((entry.amount / completedOrders.filter((order) => (order.currency || "").toUpperCase() === entry.currency).length) * 100) / 100,
  }));
  const avgOrderValue = !ordersAvailable
    ? null
    : completedOrders.length === 0
      ? 0
      : currency && completedOrdersWithoutCurrencyCount === 0 && completedOrdersWithoutAmountCount === 0
        ? avgOrderValueByCurrency[0]?.amount ?? null
        : null;
  const conversionRate = calls.length > 0 ? (completedOrders.length / calls.length) * 100 : 0;

  return {
    scope,
    scopeLabel,
    accessibleTeams,
    sources: {
      calls: callsAvailable ? "ready" : "unavailable",
      orders: ordersAvailable ? "ready" : "unavailable",
      operators: operatorsAvailable ? "ready" : "unavailable",
      teams: teamsAvailable ? "ready" : "unavailable",
    },
    totalRevenue: totalRevenue === null ? null : Math.round(totalRevenue * 100) / 100,
    revenueByCurrency,
    completedOrdersCount: completedOrders.length,
    completedOrdersWithoutCurrencyCount,
    completedOrdersWithoutAmountCount,
    projectedRevenue: 0,
    forecastGrowthPercent: 0,
    forecastAvailable: false,
    avgOrderValue: avgOrderValue === null ? null : Math.round(avgOrderValue * 100) / 100,
    avgOrderValueByCurrency,
    currencies,
    totalCalls: calls.length,
    conversionRate: Math.round(conversionRate * 10) / 10,
    objectionResolutionRate: null,
    objectionMetricsAvailable: false,
    weeklySales: getWeeklySales(completedOrders),
    objectionBreakdown: [],
    teamLeaderboard: getTeamLeaderboard(calls, orders, profiles),
    conversionAvailable: callsAvailable && ordersAvailable && calls.length > 0,
    teamMetricsAvailable: callsAvailable && ordersAvailable && operatorsAvailable && agentIds.length > 0,
    daily: getDailyTeamSummary(calls, orders),
    callActivity: getCallActivity(calls),
  };
}
