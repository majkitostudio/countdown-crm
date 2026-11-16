"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AgentLeaderboardPoint, AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { formatCurrencyAmount, formatCurrencyAmounts } from "@/lib/currency";
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy className="w-4 h-4 shrink-0 text-zinc-400" />
          <h3 className="min-w-0 text-sm font-semibold text-zinc-100">
            Nejúspěšnější operátoři
          </h3>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
          <span className="min-w-0 text-[11px] text-zinc-400">
            Celé dostupné období · částky v měnách objednávek
          </span>
          <span className="min-w-0 text-[11px] text-zinc-400 uppercase tracking-wider">
            {scope === "team" ? "Pořadí v týmu" : "Pořadí v pracovním prostoru"}
          </span>
        </div>
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
              className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex flex-col gap-3 hover:border-zinc-700/80 transition-colors duration-150 ease-interface sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex w-full items-center gap-3 min-w-0">
                <span className="w-5 text-center text-xs font-mono font-bold text-zinc-400 shrink-0">
                  #{index + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-200 shrink-0">
                  {agent.agentName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="text-xs font-medium text-zinc-200 [overflow-wrap:anywhere]">{agent.agentName}</span>
                  <span className="break-words text-[11px] text-zinc-400">
                    {agent.role} • Hovory: <span className="font-mono tabular-nums">{agent.callsCount}</span> • Konverze <span className="font-mono tabular-nums">{agent.conversionRate.toFixed(1)} %</span>
                  </span>
                </div>
              </div>

              <div className="min-w-0 text-left sm:shrink-0 sm:pl-3 sm:text-right">
                <span className="text-xs font-semibold text-zinc-100 font-mono">
                  {agent.ordersCount === 0
                    ? formatCurrencyAmount(0, "CZK")
                    : agent.ordersWithoutCurrencyCount > 0 || agent.ordersWithoutAmountCount > 0
                      ? "—"
                      : formatCurrencyAmounts(agent.revenueByCurrency)}
                </span>
                <span className="block text-[11px] text-zinc-400">
                  Objednávky: <span className="font-mono tabular-nums">{agent.ordersCount}</span>
                  {(agent.ordersWithoutCurrencyCount > 0 || agent.ordersWithoutAmountCount > 0) && (
                    <>
                      {agent.ordersWithoutAmountCount > 0 && <> · chybí částka u <span className="font-mono tabular-nums">{agent.ordersWithoutAmountCount}</span></>}
                      {agent.ordersWithoutAmountCount > 0 && agent.ordersWithoutCurrencyCount > 0 && "; "}
                      {agent.ordersWithoutCurrencyCount > 0 && <> · chybí měna u <span className="font-mono tabular-nums">{agent.ordersWithoutCurrencyCount}</span></>}
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
