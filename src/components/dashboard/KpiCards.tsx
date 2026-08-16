"use client";

import { useEffect, useState } from "react";
import { DollarSign, PhoneCall, TrendingUp, Users } from "lucide-react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";

interface KpiItem {
  id: string;
  label: string;
  value: string;
  trend: string;
  subtext: string;
  icon: typeof PhoneCall;
}

const EMPTY_KPIS: KpiItem[] = [
  { id: "calls", label: "Total Calls", value: "0", trend: "0%", subtext: "no calls recorded", icon: PhoneCall },
  { id: "conversion", label: "Conversion Rate", value: "0%", trend: "0%", subtext: "no orders recorded", icon: TrendingUp },
  { id: "revenue", label: "Total Revenue", value: "$0.00", trend: "0%", subtext: "no orders recorded", icon: DollarSign },
  { id: "agents", label: "Active Agents", value: "0", trend: "0%", subtext: "presence data unavailable", icon: Users },
];

export function KpiCards() {
  const [kpis, setKpis] = useState<KpiItem[]>(EMPTY_KPIS);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadKpis() {
      try {
        const analytics = await getAnalyticsDataAction();
        if (cancelled) return;

        setLoadError(null);
        setKpis([
          { id: "calls", label: "Total Calls", value: String(analytics.totalCalls), trend: "0%", subtext: "workspace total", icon: PhoneCall },
          { id: "conversion", label: "Conversion Rate", value: `${analytics.conversionRate.toFixed(1)}%`, trend: "0%", subtext: "orders / calls", icon: TrendingUp },
          { id: "revenue", label: "Total Revenue", value: `$${analytics.totalRevenue.toFixed(2)}`, trend: "0%", subtext: "completed orders", icon: DollarSign },
          { id: "agents", label: "Active Agents", value: "—", trend: "—", subtext: "presence data unavailable", icon: Users },
        ]);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Analytics data could not be loaded.");
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
      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">
          Analytics unavailable: {loadError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
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
    </div>
  );
}
