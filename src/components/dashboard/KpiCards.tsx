"use client";

import { useEffect, useState } from "react";
import { DollarSign, PhoneCall, TrendingUp, Users } from "lucide-react";
import { getCalls } from "@/lib/calls";
import { getOrders } from "@/lib/orders";

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

  useEffect(() => {
    void Promise.all([getCalls(), getOrders()]).then(([calls, orders]) => {
      const revenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const conversion = calls.length ? (orders.length / calls.length) * 100 : 0;
      setKpis([
        { id: "calls", label: "Total Calls", value: String(calls.length), trend: "0%", subtext: "workspace total", icon: PhoneCall },
        { id: "conversion", label: "Conversion Rate", value: `${conversion.toFixed(1)}%`, trend: "0%", subtext: "orders / calls", icon: TrendingUp },
        { id: "revenue", label: "Total Revenue", value: `$${revenue.toFixed(2)}`, trend: "0%", subtext: `${orders.length} orders`, icon: DollarSign },
        { id: "agents", label: "Active Agents", value: "1", trend: "100%", subtext: "current user", icon: Users },
      ]);
    }).catch(() => undefined);
  }, []);

  return (
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
  );
}
