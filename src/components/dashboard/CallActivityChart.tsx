"use client";

import { BarChart2, Info } from "lucide-react";

export function CallActivityChart() {
  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Call Volume & Hourly Activity</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          Hourly activity requires a persisted time-series source that is not connected to this pilot yet.
        </p>
      </div>

      <div className="min-h-48 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-xs font-medium text-zinc-200">Hourly activity unavailable</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            No synthetic bars or peak-hour assumptions are shown until the dashboard can read real persisted call timestamps.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/40">
        <Info className="w-3 h-3" />
        <span>Connect persisted call activity to enable this view.</span>
      </div>
    </div>
  );
}
