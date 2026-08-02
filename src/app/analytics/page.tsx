"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  ShieldCheck,
  Download,
  Users,
  Sparkles,
  ArrowUpRight,
  PieChart as PieIcon,
  Calendar
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  AnalyticsOverview,
  getAnalyticsData,
  exportAnalyticsToCSV,
  MOCK_ANALYTICS_DATA
} from "@/lib/analytics";

const OBJECTION_COLORS = ["#f59e0b", "#06b6d4", "#10b981", "#8b5cf6"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview>(MOCK_ANALYTICS_DATA);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const res = await getAnalyticsData();
      setData(res);
    }
    loadData();
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    exportAnalyticsToCSV(data);
    setTimeout(() => setIsExporting(false), 1500);
  };

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      {/* Header Bar Hero Banner */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-zinc-400" />
              Manager BI & AI Revenue Forecast
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              Live BI Stream
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time sales velocity, objection resolution benchmarks, and 30-day AI predictive forecasts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-zinc-400" />
            <span>{isExporting ? "Exporting CSV..." : "Export Analytics (CSV)"}</span>
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Revenue & AI Forecast */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Sales Volume</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-semibold font-mono text-zinc-100">${data.totalRevenue.toLocaleString()}</span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{data.forecastGrowthPercent}% AI Forecast (${data.projectedRevenue.toLocaleString()})</span>
            </div>
          </div>
        </div>

        {/* Average Order Value AOV */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Average Order Value (AOV)</span>
            <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-semibold font-mono text-cyan-400">${data.avgOrderValue.toFixed(2)}</span>
            <p className="text-[11px] text-zinc-400 mt-1">Driven by 15% Cross-sell Bundles</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Call Conversion Rate</span>
            <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-semibold text-amber-400">{data.conversionRate}%</span>
            <p className="text-[11px] text-zinc-400 mt-1">Based on {data.totalCalls} total calls</p>
          </div>
        </div>

        {/* Objection Resolution Rate */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Objection Overcome %</span>
            <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-semibold text-zinc-200">{data.objectionResolutionRate}%</span>
            <p className="text-[11px] text-zinc-400 mt-1">Gemini battle-cards success</p>
          </div>
        </div>

      </div>

      {/* Charts Section: Weekly Sales Forecast & Objection Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Revenue & AI Forecast Area Chart */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Weekly Sales Revenue vs. AI Target
              </h2>
              <p className="text-[11px] text-zinc-400">Actual daily revenue compared against AI predicted target</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Actual
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Forecast
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklySales}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} tickFormatter={(val: number | string) => `$${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="forecast" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorFore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Objection Distribution Pie Chart */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-zinc-800/80 pb-3">
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-400" />
              Customer Objection Breakdown
            </h2>
            <p className="text-[11px] text-zinc-400">Distribution of objections detected during calls</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.objectionBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {data.objectionBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={OBJECTION_COLORS[index % OBJECTION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
            {data.objectionBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: OBJECTION_COLORS[idx % OBJECTION_COLORS.length] }}
                  />
                  <span className="text-zinc-300 font-medium">{item.name}</span>
                </div>
                <span className="font-mono text-zinc-400 font-semibold">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Team Leaderboard Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-400" />
              Team Performance Leaderboard
            </h2>
            <p className="text-[11px] text-zinc-400">Sales velocity and conversion ranking across representatives</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-zinc-800/80">
              <tr>
                <th className="px-4 py-3">Representative</th>
                <th className="px-4 py-3">Completed Calls</th>
                <th className="px-4 py-3">Orders Placed</th>
                <th className="px-4 py-3">Revenue Generated</th>
                <th className="px-4 py-3 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {data.teamLeaderboard.map((ag, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3.5 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-zinc-200 text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-100">{ag.agentName}</p>
                      <p className="text-[11px] text-zinc-500">{ag.role}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono">{ag.callsCount}</td>
                  <td className="px-4 py-3.5 font-mono text-zinc-200">{ag.ordersCount}</td>
                  <td className="px-4 py-3.5 font-mono font-semibold text-emerald-400">
                    ${ag.revenueGenerated.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-amber-400">
                    {ag.conversionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
