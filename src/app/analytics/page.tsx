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
import type { AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { exportAnalyticsDataAction, getAnalyticsDataAction } from "@/app/actions/analytics";
import { exportAnalyticsToCSV } from "@/lib/analyticsExport";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrencyAmount, formatCurrencyAmounts } from "@/lib/currency";

const OBJECTION_COLORS = ["#e4e4e7", "#a1a1aa", "#71717a", "#52525b"];

export default function AnalyticsPage() {
  const emptyData: AnalyticsOverview = {
    totalRevenue: 0,
    revenueByCurrency: [],
    projectedRevenue: 0,
    forecastGrowthPercent: 0,
    forecastAvailable: false,
    avgOrderValue: 0,
    avgOrderValueByCurrency: [],
    currencies: [],
    totalCalls: 0,
    conversionRate: 0,
    objectionResolutionRate: 0,
    objectionMetricsAvailable: false,
    weeklySales: [],
    objectionBreakdown: [],
    teamLeaderboard: [],
    teamMetricsAvailable: false,
    daily: {
      date: new Date().toISOString().slice(0, 10),
      calls: 0,
      completedOrders: 0,
      revenue: 0,
      revenueByCurrency: [],
      currency: null,
      conversionRate: 0,
    },
  };
  const [result, setResult] = useState<AnalyticsActionResult<AnalyticsOverview> | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const data = result?.ok ? result.data : emptyData;
  const isEmptySuccess = result?.ok
    && result.data.totalCalls === 0
    && result.data.revenueByCurrency.length === 0
    && result.data.teamLeaderboard.length === 0;
  const status = result === null
    ? "loading"
    : result.ok
      ? isEmptySuccess ? "empty" : "success"
      : result.code === "FORBIDDEN" ? "forbidden" : "unavailable";

  useEffect(() => {
    async function loadData() {
      try {
        setResult(await getAnalyticsDataAction());
      } catch (error: unknown) {
        setResult({
          ok: false,
          code: "UNAVAILABLE",
          status: 503,
          message: error instanceof Error ? error.message : "Analytics query failed",
        });
      }
    }
    loadData();
  }, []);

  const handleExport = async () => {
    if (!result?.ok) return;

    setIsExporting(true);
    setExportError(null);
    try {
      const exportResult = await exportAnalyticsDataAction();
      if (!exportResult.ok) {
        setResult(exportResult);
        setExportError(exportResult.message);
        return;
      }
      exportAnalyticsToCSV(exportResult.data);
    } catch (error: unknown) {
      setExportError(error instanceof Error ? error.message : "Analytics export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      <PageHeader
        icon={BarChart3}
        title="Team Leader BI & Revenue Analytics"
        badge={{
          label: status === "loading"
            ? "Loading"
            : status === "forbidden"
              ? "Forbidden"
              : status === "unavailable"
                ? "Unavailable"
                : status === "empty" ? "No activity" : "Workspace DB",
          tone: status === "success" ? "neutral" : "unavailable",
        }}
        description="Workspace-scoped revenue and call metrics. Forecasts and attribution require additional persisted sources."
        actions={
          result?.ok ? (
            <button
              onClick={() => void handleExport()}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-300 shadow-sm transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <Download className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <span>{isExporting ? "Exporting CSV..." : "Export workspace CSV"}</span>
            </button>
          ) : undefined
        }
      />

      {result === null && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-sm text-zinc-400">
          Loading workspace analytics...
        </div>
      )}

      {result && !result.ok && (
        <div role="alert" className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/60 text-sm text-rose-300">
          {result.code === "FORBIDDEN" ? "Analytics forbidden: " : "Analytics unavailable: "}{result.message}
        </div>
      )}

      {exportError && (
        <div role="alert" className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/60 text-sm text-rose-300">
          Analytics export unavailable: {exportError}
        </div>
      )}

      {result?.ok && isEmptySuccess && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-sm text-zinc-300">
          No persisted calls or completed-order activity is available for this workspace yet.
        </div>
      )}

      {result?.ok && <>
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Revenue & AI Forecast */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Sales Volume</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-zinc-100">{formatCurrencyAmounts(data.revenueByCurrency)}</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {data.forecastAvailable
                  ? `+${data.forecastGrowthPercent}% AI Forecast (${formatCurrencyAmount(data.projectedRevenue, data.currencies[0] || "USD")})`
                  : "AI Forecast unavailable"}
              </span>
            </div>
          </div>
        </div>

        {/* Average Order Value AOV */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Average Order Value (AOV)</span>
            <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-zinc-100">{formatCurrencyAmounts(data.avgOrderValueByCurrency)}</span>
            <p className="text-[11px] text-zinc-400 mt-1">Calculated from completed orders in the workspace</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Call Conversion Rate</span>
            <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-zinc-100">{data.conversionRate}%</span>
            <p className="text-[11px] text-zinc-400 mt-1">Based on {data.totalCalls} total calls</p>
          </div>
        </div>

        {/* Objection Resolution Rate */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Objection Overcome %</span>
            <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-zinc-100">
              {data.objectionMetricsAvailable && data.objectionResolutionRate !== null
                ? `${data.objectionResolutionRate}%`
                : "—"}
            </span>
            <p className="text-[11px] text-zinc-400 mt-1">No persisted objection outcome metric</p>
          </div>
        </div>

      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-100">AI Predictive Revenue Forecasting</h2>
        <p className="text-xs text-zinc-500 mt-2">
          Forecast unavailable: no persisted forecasting model or pipeline probability source is connected to this pilot.
        </p>
      </div>

      {/* Charts Section: Weekly Sales Forecast & Objection Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Revenue & AI Forecast Area Chart */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-400" />
                Weekly Sales Revenue (actual)
              </h2>
              <p className="text-[11px] text-zinc-400">Completed-order revenue from the last seven days</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-zinc-200">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" /> Actual
              </span>
              {data.forecastAvailable && <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" /> Forecast
              </span>}
            </div>
          </div>

          {data.currencies.length > 1 ? (
            <div role="status" className="flex h-64 items-center justify-center rounded-xl border border-amber-900/50 bg-amber-950/20 p-6 text-center text-xs text-amber-200">
              Weekly revenue chart is unavailable for mixed currencies. Amounts remain separated in the revenue breakdown.
            </div>
          ) : <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklySales}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4d4d8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4d4d8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} tickFormatter={(val: number | string) => formatCurrencyAmount(Number(val), data.currencies[0] || "USD")} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#e4e4e7" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                {data.forecastAvailable && <Area type="monotone" dataKey="forecast" stroke="#71717a" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorFore)" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>}
        </div>

        {/* Customer Objection Distribution Pie Chart */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-zinc-800/80 pb-3">
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-zinc-400" />
              Customer Objection Breakdown
            </h2>
            <p className="text-[11px] text-zinc-400">Distribution of objections detected during calls</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {!data.objectionMetricsAvailable ? (
              <p className="text-xs text-zinc-500 text-center px-6">Objection breakdown unavailable: no persisted objection outcome data.</p>
            ) : (
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
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
            {data.objectionMetricsAvailable && data.objectionBreakdown.map((item, idx) => (
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

        {data.teamMetricsAvailable ? <div className="overflow-x-auto">
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
                    <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-zinc-200 text-xs font-mono">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-100">{ag.agentName}</p>
                      <p className="text-[11px] text-zinc-500">{ag.role}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono">{ag.callsCount}</td>
                  <td className="px-4 py-3.5 font-mono text-zinc-200">{ag.ordersCount}</td>
                  <td className="px-4 py-3.5 font-mono font-semibold text-zinc-200">
                    {formatCurrencyAmounts(ag.revenueByCurrency)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-zinc-300 font-mono">
                    {ag.conversionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> : <p className="text-xs text-zinc-500 py-6">Team leaderboard unavailable: no persisted operator attribution data.</p>}
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-100">AI Operator Coaching</h2>
        <p className="text-xs text-zinc-500 mt-2">Coaching benchmarks unavailable until operator-attributed call outcomes are persisted.</p>
      </div>

      </>}
    </div>
  );
}
