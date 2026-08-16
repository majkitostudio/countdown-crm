"use client";

import { Trophy } from "lucide-react";

export function TopPerformers() {
  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Top Performing Agents
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
          Shift Ranking
        </span>
      </div>

      <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
        <p className="text-xs font-medium text-zinc-200">Team leaderboard unavailable</p>
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Operator attribution and persisted team performance metrics are not connected to this pilot yet.
        </p>
      </div>
    </div>
  );
}
