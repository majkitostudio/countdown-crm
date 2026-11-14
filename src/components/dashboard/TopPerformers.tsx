"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AgentLeaderboardPoint, AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { formatCurrencyAmounts } from "@/lib/currency";
import { StatusAlert } from "@/components/ui/Status";

export function TopPerformers({ scope = "workspace" }: { scope?: "team" | "workspace" }) {
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
            message: error instanceof Error ? error.message : "Žebříček se nepodařilo načíst.",
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

  const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";

  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Nejúspěšnější operátoři
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
          {scope === "team" ? "Pořadí v týmu" : "Pořadí v pracovním prostoru"}
        </span>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 text-xs text-zinc-400">
          Načítám žebříček {scope === "team" ? "týmu" : "pracovního prostoru"}…
        </div>
      ) : result && !result.ok ? (
        <StatusAlert tone={feedbackTone}>
          <p className="text-xs font-medium">
            {result.code === "FORBIDDEN" ? "Přístup k žebříčku je omezen" : "Žebříček není dostupný"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">{result.message}</p>
        </StatusAlert>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-200">Zatím žádná přiřazená aktivita</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Žebříček se zobrazí, až budou hovory nebo dokončené objednávky {scope === "team" ? "týmu" : "pracovního prostoru"} přiřazené operátorům.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {leaderboard.slice(0, 5).map((agent, index) => (
            <div
              key={`${agent.agentName}-${index}`}
              className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between hover:border-zinc-700/80 transition-colors duration-150 ease-interface"
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
                    {agent.role} • Hovory: {agent.callsCount} • Konverze {agent.conversionRate.toFixed(1)} %
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0 pl-3">
                <span className="text-xs font-semibold text-zinc-100 font-mono">
                  {formatCurrencyAmounts(agent.revenueByCurrency)}
                </span>
                <span className="block text-[10px] text-zinc-500 font-mono">
                  Objednávky: {agent.ordersCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
