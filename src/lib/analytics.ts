import "server-only";

import type { Database } from "./supabase/types";
import { createDataClient } from "./dal/db";
import { requireWorkspaceRole } from "./dal/workspace";
import { listWorkspaceCallsInContext, listWorkspaceOrdersInContext } from "./dal/activity";
import { getWorkspaceRoleLabel } from "./auth/roles";

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
  revenue: number;
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
  revenueGenerated: number;
  conversionRate: number;
}

export interface AnalyticsOverview {
  totalRevenue: number;
  projectedRevenue: number;
  forecastGrowthPercent: number;
  forecastAvailable: boolean;
  avgOrderValue: number;
  totalCalls: number;
  conversionRate: number;
  objectionResolutionRate: number | null;
  objectionMetricsAvailable: boolean;
  weeklySales: WeeklySalesPoint[];
  objectionBreakdown: ObjectionCategoryPoint[];
  teamLeaderboard: AgentLeaderboardPoint[];
  teamMetricsAvailable: boolean;
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
    const revenue = orders
      .filter((order) => order.created_at.slice(0, 10) === dateKey && order.status === "completed")
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    points.push({
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      revenue: Math.round(revenue * 100) / 100,
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
  const statsByAgent = new Map<string, { callsCount: number; ordersCount: number; revenueGenerated: number }>();

  const ensureAgent = (agentId: string) => {
    const current = statsByAgent.get(agentId);
    if (current) return current;
    const empty = { callsCount: 0, ordersCount: 0, revenueGenerated: 0 };
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
    stats.revenueGenerated += Number(order.total_amount || 0);
  });

  return Array.from(statsByAgent.entries())
    .map(([agentId, stats]) => {
      const profile = profileById.get(agentId);
      const agentName = profile?.full_name?.trim() || "Unknown operator";
      const role = profile?.role ? getWorkspaceRoleLabel(profile.role) : "Role unavailable";

      return {
        agentName,
        role,
        callsCount: stats.callsCount,
        ordersCount: stats.ordersCount,
        revenueGenerated: Math.round(stats.revenueGenerated * 100) / 100,
        conversionRate: stats.callsCount > 0
          ? Math.round((stats.ordersCount / stats.callsCount) * 1000) / 10
          : 0,
      };
    })
    .sort((a, b) => {
      if (b.revenueGenerated !== a.revenueGenerated) {
        return b.revenueGenerated - a.revenueGenerated;
      }
      if (b.ordersCount !== a.ordersCount) {
        return b.ordersCount - a.ordersCount;
      }
      return b.callsCount - a.callsCount;
    });
}

/** Retrieves recent workspace activity with real customer and operator attribution. */
export async function getRecentActivity(limit = 8, requestedWorkspaceId?: string): Promise<RecentActivityEntry[]> {
  const context = await requireWorkspaceRole(ANALYTICS_ALLOWED_ROLES, requestedWorkspaceId);
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const [calls, orders] = await Promise.all([
    listWorkspaceCallsInContext(context, safeLimit),
    listWorkspaceOrdersInContext(context, safeLimit),
  ]);

  const activity: RecentActivityEntry[] = [
    ...calls.map((call) => ({
      id: `call-${call.id}`,
      type: "call" as const,
      timestamp: call.created_at,
      customerName: call.lead_name,
      operatorName: call.agent_name,
      durationSeconds: call.duration_seconds,
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
      amount: order.total_amount,
    })),
  ];

  return activity
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, safeLimit);
}

/** Retrieves Team Leader analytics computed from workspace-scoped Supabase data. */
export async function getAnalyticsData(requestedWorkspaceId?: string): Promise<AnalyticsOverview> {
  const context = await requireWorkspaceRole(ANALYTICS_ALLOWED_ROLES, requestedWorkspaceId);
  const supabase = await createDataClient();

  const [ordersRes, callsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("workspace_id", context.workspaceId),
    supabase.from("calls").select("*").eq("workspace_id", context.workspaceId),
  ]);

  if (ordersRes.error || callsRes.error) throw new Error("Analytics query failed");

  const orders = (ordersRes.data || []) as OrderRow[];
  const calls = (callsRes.data || []) as CallRow[];
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

  if (profilesError) throw new Error("Analytics operator lookup failed");

  const profiles = profileRows as ProfileRow[];
  const completedOrders = orders.filter((order) => order.status === "completed");
  const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  const conversionRate = calls.length > 0 ? (completedOrders.length / calls.length) * 100 : 0;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    projectedRevenue: 0,
    forecastGrowthPercent: 0,
    forecastAvailable: false,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    totalCalls: calls.length,
    conversionRate: Math.round(conversionRate * 10) / 10,
    objectionResolutionRate: null,
    objectionMetricsAvailable: false,
    weeklySales: getWeeklySales(completedOrders),
    objectionBreakdown: [],
    teamLeaderboard: getTeamLeaderboard(calls, orders, profiles),
    teamMetricsAvailable: agentIds.length > 0,
  };
}
