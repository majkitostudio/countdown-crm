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
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Manager BI & AI Revenue Forecast
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time sales velocity, objection resolution benchmarks, and 30-day AI predictive forecasts
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-zinc-700 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>{isExporting ? "Exporting CSV..." : "Export Analytics (CSV)"}</span>
        </button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue & AI Forecast */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Sales Volume</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-zinc-100">${data.totalRevenue.toLocaleString()}</span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{data.forecastGrowthPercent}% AI Forecast (${data.projectedRevenue.toLocaleString()})</span>
            </div>
          </div>
        </div>

        {/* Average Order Value AOV */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Average Order Value (AOV)</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-cyan-400">${data.avgOrderValue.toFixed(2)}</span>
            <p className="text-[11px] text-zinc-400 mt-1">Driven by 15% Cross-sell Bundles</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Call Conversion Rate</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-amber-400">{data.conversionRate}%</span>
            <p className="text-[11px] text-zinc-400 mt-1">Based on {data.totalCalls} total calls</p>
          </div>
        </div>

        {/* Objection Resolution Rate */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Objection Overcome %</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-purple-400">{data.objectionResolutionRate}%</span>
            <p className="text-[11px] text-zinc-400 mt-1">Gemini battle-cards success</p>
          </div>
        </div>

      </div>

      {/* Charts Section: Weekly Sales Forecast & Objection Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Revenue & AI Forecast Area Chart */}
        <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Weekly Sales Revenue vs. AI Target
              </h2>
              <p className="text-[11px] text-zinc-400">Actual daily revenue compared against AI predicted target</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
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
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
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

          <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs">
            {data.objectionBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: OBJECTION_COLORS[idx % OBJECTION_COLORS.length] }}
                  />
                  <span className="text-zinc-300 font-medium">{item.name}</span>
                </div>
                <span className="font-mono text-zinc-400 font-bold">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Team Leaderboard Table */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Team Performance Leaderboard
            </h2>
            <p className="text-[11px] text-zinc-400">Sales velocity and conversion ranking across representatives</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-zinc-800">
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
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100">{ag.agentName}</p>
                      <p className="text-[11px] text-zinc-500">{ag.role}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono">{ag.callsCount}</td>
                  <td className="px-4 py-3.5 font-mono text-zinc-200">{ag.ordersCount}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                    ${ag.revenueGenerated.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-amber-400">
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
