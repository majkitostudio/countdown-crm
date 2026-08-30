"use client";

import { useEffect, useState } from "react";
import { DollarSign, PhoneCall, TrendingUp, Users } from "lucide-react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";

export function KpiCards({ compact = false }: { compact?: boolean }) {
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
      <div className={`grid grid-cols-2 gap-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-4 sm:gap-6"}`}>
        {[
          { id: "calls", label: "Team Calls", value: String(result.data.totalCalls), trend: "—", subtext: "all workspace calls", icon: PhoneCall },
          { id: "conversion", label: "Team Conversion Rate", value: `${result.data.conversionRate.toFixed(1)}%`, trend: "—", subtext: "team orders / calls", icon: TrendingUp },
          { id: "revenue", label: "Team Revenue", value: `$${result.data.totalRevenue.toFixed(2)}`, trend: "—", subtext: "team completed orders", icon: DollarSign },
          { id: "operators", label: "Operators in Workspace", value: "—", trend: "—", subtext: "team presence unavailable", icon: Users },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className={`${compact ? "space-y-2 rounded-xl p-4" : "space-y-4 rounded-2xl p-6"} border border-zinc-800/80 border-t border-white/5 bg-zinc-900/40 shadow-sm transition-all hover:border-zinc-700/80`}>
              <div className="flex items-center justify-between">
                <span className={`${compact ? "text-[10px]" : "text-xs"} font-medium text-zinc-400`}>{kpi.label}</span>
                <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 sm:flex">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className={compact ? "space-y-1" : "space-y-1.5"}>
                <div className="flex items-baseline justify-between">
                  <span className={`${compact ? "text-xl" : "text-2xl"} font-mono font-semibold tracking-tight text-zinc-100`}>{kpi.value}</span>
                </div>
                <div className={`${compact ? "text-[10px]" : "text-[11px]"} flex items-center gap-2 text-zinc-400`}>
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
