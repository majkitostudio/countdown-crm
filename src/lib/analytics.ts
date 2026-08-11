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

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type CallRow = Database["public"]["Tables"]["calls"]["Row"];

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
    teamLeaderboard: [],
    teamMetricsAvailable: false,
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
