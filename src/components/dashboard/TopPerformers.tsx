"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AgentLeaderboardPoint, AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { formatCurrencyAmounts } from "@/lib/currency";
import { StatusAlert } from "@/components/ui/Status";
import { Button } from "@/components/ui/Button";

export function TopPerformers({ scope = "workspace" }: { scope?: "team" | "workspace" }) {
  const [leaderboard, setLeaderboard] = useState<AgentLeaderboardPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AnalyticsActionResult<AnalyticsOverview> | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
  }, [retryKey]);

  const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";

  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Nejlepší výsledky
          </h3>
        </div>
        <span className="text-[10px] text-zinc-400">
          {scope === "team" ? "Moje týmy" : "Celý workspace"}
        </span>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Načítám pořadí operátorů" className="space-y-2.5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg border border-zinc-800/60 bg-zinc-950/60 motion-reduce:animate-none" />
          ))}
        </div>
      ) : result && !result.ok ? (
        <div className="space-y-3">
          <StatusAlert tone={feedbackTone}>
            <p className="text-xs font-medium">
              {result.code === "FORBIDDEN" ? "K tomuto přehledu nemáte přístup." : "Pořadí operátorů není dostupné."}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">{result.message}</p>
          </StatusAlert>
          {result.code !== "FORBIDDEN" && (
            <Button variant="secondary" onClick={() => {
              setResult(null);
              setRetryKey((key) => key + 1);
            }}>
              Načíst znovu
            </Button>
          )}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-200">Zatím nejsou k dispozici přiřazené výsledky</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Pořadí se zobrazí, až budou hovory nebo dokončené objednávky přiřazeny operátorům.
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
                    {agent.callsCount} hovorů · úspěšnost {agent.conversionRate.toFixed(1)} %
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0 pl-3">
                <span className="text-xs font-semibold text-zinc-100 font-mono">
                  {formatCurrencyAmounts(agent.revenueByCurrency)}
                </span>
                <span className="block text-[10px] text-zinc-500 font-mono">
                  {agent.ordersCount} objednávek
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
