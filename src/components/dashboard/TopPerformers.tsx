"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AgentLeaderboardPoint, AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { formatCurrencyAmounts } from "@/lib/currency";

export function TopPerformers() {
  const [leaderboard, setLeaderboard] = useState<AgentLeaderboardPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AnalyticsActionResult<AnalyticsOverview> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setIsLoading(true);

      try {
        const analyticsResult = await getAnalyticsDataAction();
        if (!cancelled) {
          setResult(analyticsResult);
          if (analyticsResult.ok) setLeaderboard(analyticsResult.data.teamLeaderboard);
        }
      } catch (error) {
        if (!cancelled) {
          setLeaderboard([]);
          setResult({
            ok: false,
            code: "UNAVAILABLE",
            status: 503,
            message: error instanceof Error ? error.message : "Leaderboard query failed",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Top Performing Operators
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
          Workspace ranking
        </span>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 text-xs text-zinc-400">
          Loading workspace leaderboard...
        </div>
      ) : result && !result.ok ? (
        <div role="alert" className="rounded-lg bg-rose-950/20 border border-rose-900/60 p-4 space-y-2">
          <p className="text-xs font-medium text-rose-200">
            {result.code === "FORBIDDEN" ? "Leaderboard forbidden" : "Leaderboard unavailable"}
          </p>
          <p className="text-[11px] leading-relaxed text-rose-300">{result.message}</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-200">No attributed activity yet</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            The leaderboard appears after workspace calls or completed orders have an operator attribution.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {leaderboard.slice(0, 5).map((agent, index) => (
            <div
              key={`${agent.agentName}-${index}`}
              className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between hover:border-zinc-700/80 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 text-center text-xs font-mono font-bold text-zinc-400 shrink-0">
                  #{index + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-200 shrink-0">
                  {agent.agentName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-zinc-200 truncate">{agent.agentName}</span>
                  <span className="text-[10px] text-zinc-400 font-mono truncate">
                    {agent.role} • {agent.callsCount} calls • {agent.conversionRate.toFixed(1)}% conv.
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0 pl-3">
                <span className="text-xs font-semibold text-zinc-100 font-mono">
                  {formatCurrencyAmounts(agent.revenueByCurrency)}
                </span>
                <span className="block text-[10px] text-zinc-500 font-mono">
                  {agent.ordersCount} orders
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
