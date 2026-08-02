"use client";

import { PhoneCall, TrendingUp, DollarSign, Users } from "lucide-react";

interface KpiItem {
  id: string;
  label: string;
  value: string;
  trend: string;
  subtext: string;
  icon: typeof PhoneCall;
  importantTag?: {
    text: string;
    type: "success" | "neutral" | "warning";
  };
}

const KPI_DATA: KpiItem[] = [
  {
    id: "calls",
    label: "Total Calls Today",
    value: "142",
    trend: "+14%",
    subtext: "vs daily average",
    icon: PhoneCall,
  },
  {
    id: "conversion",
    label: "Conversion Rate",
    value: "34.2%",
    trend: "+3.8%",
    subtext: "target 30.0%",
    icon: TrendingUp,
    importantTag: {
      text: "Above Target",
      type: "success",
    },
  },
  {
    id: "revenue",
    label: "Daily Revenue",
    value: "$8,450",
    trend: "+$1,200",
    subtext: "12 closed deals",
    icon: DollarSign,
  },
  {
    id: "agents",
    label: "Active Agents",
    value: "8 / 10",
    trend: "80%",
    subtext: "6 ready • 2 in call",
    icon: Users,
    importantTag: {
      text: "2 In Call",
      type: "warning",
    },
  },
];

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {KPI_DATA.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.id}
            className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 hover:border-zinc-700/80 transition-all space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                {kpi.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-zinc-100 tracking-tight font-sans">
                  {kpi.value}
                </span>
                {kpi.importantTag && (
                  <span
                    className={
                      kpi.importantTag.type === "success"
                        ? "px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                        : "px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60"
                    }
                  >
                    {kpi.importantTag.text}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="text-zinc-300 font-mono font-medium">
                  {kpi.trend}
                </span>
                <span>•</span>
                <span>{kpi.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
