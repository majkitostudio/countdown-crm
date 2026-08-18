import { PhoneCall, Plus } from "lucide-react";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { CallActivityChart } from "@/components/dashboard/CallActivityChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ReorderWidget } from "@/components/dashboard/ReorderWidget";

export default function Home() {
  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      {/* Top Banner / Welcome Header */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              Dashboard Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Shift Active
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time tele-sales metrics, live call stream, and operator performance tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
          <a
            href="/workspace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <PhoneCall className="w-4 h-4" />
            Launch Operator Console
          </a>
        </div>
      </div>

      {/* 1. KPI Cards Row */}
      <KpiCards />

      {/* 2. Predictive Re-Order Engine Widget */}
      <ReorderWidget />

      {/* 3. Main Analytics Grid (Call Activity Chart + Top Performers) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CallActivityChart />
        </div>
        <div>
          <TopPerformers />
        </div>
      </div>

      {/* 4. Recent Activity Stream */}
      <RecentActivityFeed />
    </div>
  );
}
