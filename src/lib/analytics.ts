import { createClient } from "./supabase/client";
import { Database } from "./supabase/types";
import { getCurrentWorkspaceId } from "./supabase/workspace";

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
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type OrderWithProduct = OrderRow & { products?: { title: string } | null };

function emptyAnalyticsData(): AnalyticsOverview {
  return {
    totalRevenue: 0,
    projectedRevenue: 0,
    forecastGrowthPercent: 0,
    forecastAvailable: false,
    avgOrderValue: 0,
    totalCalls: 0,
    conversionRate: 0,
    objectionResolutionRate: null,
    objectionMetricsAvailable: false,
    weeklySales: [],
    objectionBreakdown: [],
    teamLeaderboard: [],
    teamMetricsAvailable: false,
  };
}

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
      const role = profile?.role || "Role unavailable";

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
export async function getRecentActivity(limit = 8): Promise<RecentActivityEntry[]> {
  const supabase = createClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const [callsRes, ordersRes] = await Promise.all([
    supabase
      .from("calls")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    supabase
      .from("orders")
      .select("*, products(title)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
  ]);

  if (callsRes.error || ordersRes.error) throw new Error("Recent activity query failed");

  const calls = (callsRes.data || []) as CallRow[];
  const orders = (ordersRes.data || []) as unknown as OrderWithProduct[];
  const leadIds = Array.from(
    new Set(
      [...calls, ...orders]
        .map((entry) => entry.lead_id)
        .filter((leadId): leadId is string => Boolean(leadId))
    )
  );
  const agentIds = Array.from(
    new Set(
      [...calls, ...orders]
        .map((entry) => entry.agent_id)
        .filter((agentId): agentId is string => Boolean(agentId))
    )
  );

  const [leadsRes, profilesRes] = await Promise.all([
    leadIds.length
      ? supabase.from("leads").select("*").eq("workspace_id", workspaceId).in("id", leadIds)
      : Promise.resolve({ data: [], error: null }),
    agentIds.length
      ? supabase.from("profiles").select("id, full_name, email, role, status, avatar_url, created_at, updated_at").in("id", agentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (leadsRes.error || profilesRes.error) throw new Error("Recent activity attribution lookup failed");

  const leads = leadsRes.data as LeadRow[];
  const profiles = profilesRes.data as ProfileRow[];
  const leadNames = new Map(leads.map((lead) => [lead.id, lead.full_name.trim() || "Unknown customer"]));
  const operatorNames = new Map(profiles.map((profile) => [profile.id, profile.full_name.trim() || "Unknown operator"]));
  const customerNameFor = (leadId: string | null) =>
    (leadId && leadNames.get(leadId)) || "Unknown customer";
  const operatorNameFor = (agentId: string | null) =>
    (agentId && operatorNames.get(agentId)) || "Unknown operator";

  const activity: RecentActivityEntry[] = [
    ...calls.map((call) => ({
      id: `call-${call.id}`,
      type: "call" as const,
      timestamp: call.created_at,
      customerName: customerNameFor(call.lead_id),
      operatorName: operatorNameFor(call.agent_id),
      durationSeconds: call.duration_seconds || 0,
      outcome: call.outcome,
      sentiment: call.ai_sentiment,
    })),
    ...orders.map((order) => ({
      id: `order-${order.id}`,
      type: "order" as const,
      timestamp: order.created_at,
      customerName: customerNameFor(order.lead_id),
      operatorName: operatorNameFor(order.agent_id),
      outcome: order.status,
      productName: order.products?.title || "Unknown product",
      amount: Number(order.total_amount || 0),
    })),
  ];

  return activity
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, safeLimit);
}

/** Retrieves manager analytics computed from workspace-scoped Supabase data. */
export async function getAnalyticsData(): Promise<AnalyticsOverview> {
  const supabase = createClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return emptyAnalyticsData();

  const [ordersRes, callsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("workspace_id", workspaceId),
    supabase.from("calls").select("*").eq("workspace_id", workspaceId),
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

export function exportAnalyticsToCSV(data: AnalyticsOverview): void {
  if (typeof window === "undefined") return;

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Metric,Value\n";
  csvContent += `Total Revenue,$${data.totalRevenue}\n`;
  csvContent += `AI Forecast Revenue (Next 30d),${data.forecastAvailable ? `$${data.projectedRevenue}` : "Unavailable"}\n`;
  csvContent += `Average Order Value (AOV),$${data.avgOrderValue}\n`;
  csvContent += `Conversion Rate,${data.conversionRate}%\n`;
  csvContent += `Objection Resolution Rate,${data.objectionResolutionRate === null ? "Unavailable" : `${data.objectionResolutionRate}%`}\n\n`;

  csvContent += "Agent,Calls,Orders,Revenue,Conversion Rate%\n";
  data.teamLeaderboard.forEach((agent) => {
    csvContent += `"${agent.agentName}",${agent.callsCount},${agent.ordersCount},$${agent.revenueGenerated},${agent.conversionRate}%\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `countdown_analytics_report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
