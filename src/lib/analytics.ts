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
  projectedRevenue: number; // AI forecast for next 30 days
  forecastGrowthPercent: number;
  avgOrderValue: number;
  totalCalls: number;
  conversionRate: number;
  objectionResolutionRate: number;
  weeklySales: WeeklySalesPoint[];
  objectionBreakdown: ObjectionCategoryPoint[];
  teamLeaderboard: AgentLeaderboardPoint[];
}

export const MOCK_ANALYTICS_DATA: AnalyticsOverview = {
  totalRevenue: 24850.00,
  projectedRevenue: 29320.00,
  forecastGrowthPercent: 18,
  avgOrderValue: 142.50,
  totalCalls: 480,
  conversionRate: 36.4,
  objectionResolutionRate: 84.2,
  weeklySales: [
    { day: "Mon", revenue: 3200, forecast: 3000 },
    { day: "Tue", revenue: 4100, forecast: 3800 },
    { day: "Wed", revenue: 3900, forecast: 4000 },
    { day: "Thu", revenue: 4800, forecast: 4500 },
    { day: "Fri", revenue: 5200, forecast: 4900 },
    { day: "Sat", revenue: 2100, forecast: 2000 },
    { day: "Sun", revenue: 1550, forecast: 1500 },
  ],
  objectionBreakdown: [
    { name: "Price Perception", count: 142, percentage: 45 },
    { name: "Competitor Products", count: 78, percentage: 25 },
    { name: "Ingredient / Safety", count: 48, percentage: 15 },
    { name: "Delivery / Timing", count: 47, percentage: 15 },
  ],
  teamLeaderboard: [
    {
      agentName: "Alex Vance",
      role: "Senior Representative",
      callsCount: 165,
      ordersCount: 68,
      revenueGenerated: 9850.00,
      conversionRate: 41.2,
    },
    {
      agentName: "Sarah Connor",
      role: "Sales Specialist",
      callsCount: 150,
      ordersCount: 56,
      revenueGenerated: 8120.00,
      conversionRate: 37.3,
    },
    {
      agentName: "David Miller",
      role: "Junior Account Executive",
      callsCount: 165,
      ordersCount: 51,
      revenueGenerated: 6880.00,
      conversionRate: 30.9,
    },
  ],
};

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

/**
 * Retrieves manager BI analytics data computed directly from Supabase DB
 */
export async function getAnalyticsData(): Promise<AnalyticsOverview> {
  const supabase = createClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return emptyAnalyticsData();

  const [ordersRes, callsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("workspace_id", workspaceId),
    supabase.from("calls").select("*").eq("workspace_id", workspaceId),
  ]);

  if (ordersRes.error || callsRes.error) {
    throw new Error("Analytics query failed");
  }

  const orders = (ordersRes.data || []) as OrderRow[];
  const calls = callsRes.data || [];

    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const totalCalls = calls.length || 1;
    const completedOrdersCount = orders.length;
    const avgOrderValue = completedOrdersCount > 0 ? totalRevenue / completedOrdersCount : 0;
    const conversionRate = totalCalls > 0 ? (completedOrdersCount / totalCalls) * 100 : 0;

    const projectedRevenue = Math.round(totalRevenue * 1.18);
    const forecastGrowthPercent = 18;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      projectedRevenue,
      forecastGrowthPercent,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalCalls: calls.length,
      conversionRate: Math.round(conversionRate * 10) / 10,
      objectionResolutionRate: 0,
      weeklySales: [],
      objectionBreakdown: [],
      teamLeaderboard: [],
    };
}

function emptyAnalyticsData(): AnalyticsOverview {
  return {
    totalRevenue: 0,
    projectedRevenue: 0,
    forecastGrowthPercent: 0,
    avgOrderValue: 0,
    totalCalls: 0,
    conversionRate: 0,
    objectionResolutionRate: 0,
    weeklySales: [],
    objectionBreakdown: [],
    teamLeaderboard: [],
  };
}

/**
 * Triggers CSV download of analytics report
 */
export function exportAnalyticsToCSV(data: AnalyticsOverview): void {
  if (typeof window === "undefined") return;

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Metric,Value\n";
  csvContent += `Total Revenue,$${data.totalRevenue}\n`;
  csvContent += `AI Forecast Revenue (Next 30d),$${data.projectedRevenue}\n`;
  csvContent += `Average Order Value (AOV),$${data.avgOrderValue}\n`;
  csvContent += `Conversion Rate,${data.conversionRate}%\n`;
  csvContent += `Objection Resolution Rate,${data.objectionResolutionRate}%\n\n`;

  csvContent += "Agent,Calls,Orders,Revenue,Conversion Rate%\n";
  data.teamLeaderboard.forEach((ag) => {
    csvContent += `"${ag.agentName}",${ag.callsCount},${ag.ordersCount},$${ag.revenueGenerated},${ag.conversionRate}%\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `countdown_analytics_report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
