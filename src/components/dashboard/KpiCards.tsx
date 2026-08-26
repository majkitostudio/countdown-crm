"use client";

import { useEffect, useState } from "react";
import { DollarSign, PhoneCall, TrendingUp, Users } from "lucide-react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";

export function KpiCards() {
  const [result, setResult] = useState<AnalyticsActionResult<AnalyticsOverview> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadKpis() {
      try {
        const analyticsResult = await getAnalyticsDataAction();
        if (cancelled) return;

        setResult(analyticsResult);
      } catch (error) {
        if (!cancelled) {
          setResult({
            ok: false,
            code: "UNAVAILABLE",
            status: 503,
            message: error instanceof Error ? error.message : "Analytics data could not be loaded.",
          });
        }
      }
    }

    void loadKpis();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      {result && !result.ok && (
        <div role="alert" className="rounded-xl border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">
          {result.code === "FORBIDDEN" ? "Analytics forbidden: " : "Analytics unavailable: "}{result.message}
        </div>
      )}
      {result === null ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-400">
          Loading workspace analytics...
        </div>
      ) : result.ok ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: "calls", label: "Total Calls", value: String(result.data.totalCalls), trend: "—", subtext: "workspace total", icon: PhoneCall },
          { id: "conversion", label: "Conversion Rate", value: `${result.data.conversionRate.toFixed(1)}%`, trend: "—", subtext: "orders / calls", icon: TrendingUp },
          { id: "revenue", label: "Total Revenue", value: `$${result.data.totalRevenue.toFixed(2)}`, trend: "—", subtext: "completed orders", icon: DollarSign },
          { id: "operators", label: "Active Operators", value: "—", trend: "—", subtext: "presence data unavailable", icon: Users },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 hover:border-zinc-700/80 transition-all space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{kpi.label}</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold text-zinc-100 tracking-tight font-mono">{kpi.value}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span className="text-zinc-300 font-mono font-medium">{kpi.trend}</span>
                  <span>•</span>
                  <span>{kpi.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      ) : null}
    </div>
  );
}
