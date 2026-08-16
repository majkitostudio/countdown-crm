"use client";

import { Activity, ArrowUpRight } from "lucide-react";

export function RecentActivityFeed() {
  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Live Call Activity & AI Sentiment Stream
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Persisted call activity and operator attribution will appear here when the feed is connected
          </p>
        </div>

        <a
          href="/calls"
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
        >
          <span>View All Calls</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
        <p className="text-xs font-medium text-zinc-200">Live activity feed unavailable</p>
        <p className="text-[11px] leading-relaxed text-zinc-400">
          The dashboard will not display fabricated calls, customers, sentiments, or operator names.
        </p>
      </div>
    </div>
  );
}
