"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Clock, PhoneCall, ShoppingBag, User } from "lucide-react";
import { getRecentActivityAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, RecentActivityResult } from "@/lib/analytics";
import { formatCurrencyAmount } from "@/lib/currency";
import { StatusAlert } from "@/components/ui/Status";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("cs-CZ", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCallOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "order_placed":
      return "Objednávka vytvořena";
    case "followup_scheduled":
      return "Naplánovaný hovor";
    case "no_answer":
      return "Bez odpovědi";
    case "objection":
      return "Neúspěch";
    case "completed":
      return "Dokončeno";
    default:
      return outcome.replaceAll("_", " ");
  }
}

function getOrderOutcomeLabel(outcome: string): string {
  return ({
    completed: "Dokončená objednávka",
    pending: "Čekající objednávka",
    in_progress: "Zpracovávaná objednávka",
    sent: "Odeslaná objednávka",
    delivered: "Doručená objednávka",
    returned: "Vrácená objednávka",
    cancelled: "Zrušená objednávka",
  } as Record<string, string>)[outcome] ?? outcome;
}

export function RecentActivityFeed({ scope = "workspace" }: { scope?: "team" | "workspace" }) {
  const [activity, setActivity] = useState<RecentActivityResult>({ entries: [], sources: { calls: "ready", orders: "ready" } });
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AnalyticsActionResult<RecentActivityResult> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      setIsLoading(true);
      try {
        const activityResult = await getRecentActivityAction();
        if (!cancelled) {
          setResult(activityResult);
          if (activityResult.ok) setActivity(activityResult.data);
        }
      } catch (error) {
        if (!cancelled) {
          setActivity({ entries: [], sources: { calls: "unavailable", orders: "unavailable" } });
          setResult({
            ok: false,
            code: "UNAVAILABLE",
            status: 503,
            message: error instanceof Error ? error.message : "Nedávnou aktivitu se nepodařilo načíst.",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, []);

  const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";

  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
      {/* Header */}
      <div className="flex w-full min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full min-w-0">
          <div className="flex w-full min-w-0 items-start gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-zinc-100">
            Nedávná aktivita {scope === "team" ? "týmu" : "pracovního prostoru"}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Uložené hovory a objednávky přiřazené {scope === "team" ? "týmu" : "pracovnímu prostoru"}
          </p>
        </div>

        <a
          href="/call-logs"
          className="max-w-full text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors duration-150 ease-interface"
        >
          <span>Zobrazit všechny hovory</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 text-xs text-zinc-400">
          Načítám nedávnou aktivitu {scope === "team" ? "týmu" : "pracovního prostoru"}…
        </div>
      ) : result && !result.ok ? (
        <StatusAlert tone={feedbackTone}>
          <p className="text-xs font-medium">
            {result.code === "FORBIDDEN" ? "Přístup k nedávné aktivitě je omezen" : "Nedávná aktivita není dostupná"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">{result.message}</p>
        </StatusAlert>
      ) : activity.entries.length === 0 ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-200">{activity.sources.calls === "unavailable" || activity.sources.orders === "unavailable" ? "Nedávná aktivita je částečně nedostupná" : `Žádná nedávná aktivita ${scope === "team" ? "týmu" : "pracovního prostoru"}`}</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            {activity.sources.calls === "unavailable" || activity.sources.orders === "unavailable" ? "Dostupný zdroj nevrátil žádné nedávné záznamy; chybějící zdroj nezobrazujeme jako prázdný." : `Uložené hovory a objednávky se zde zobrazí po přiřazení k aktivnímu ${scope === "team" ? "týmu" : "pracovnímu prostoru"}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {(activity.sources.calls === "unavailable" || activity.sources.orders === "unavailable") && (
            <p role="status" className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">
              Částečný přehled. Nedostupné zdroje: {activity.sources.calls === "unavailable" ? "hovory" : ""}{activity.sources.calls === "unavailable" && activity.sources.orders === "unavailable" ? " a " : ""}{activity.sources.orders === "unavailable" ? "objednávky" : ""}.
            </p>
          )}
          {activity.entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-zinc-700/80 transition-all duration-150 ease-interface"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                  {entry.type === "call" ? <PhoneCall className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                     <span className="text-xs font-semibold text-zinc-100 [overflow-wrap:anywhere]">{entry.customerName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.operatorName}
                    </span>
                    {entry.type === "call" ? (
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.durationSeconds || 0)}
                      </span>
                    ) : (
                      <span>{entry.productName}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                {entry.type === "call" && entry.sentiment && entry.sentiment !== "Neutral" && (
                  <span className="hidden sm:inline-block px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                    {({ Positive: "Pozitivní", Negative: "Negativní", Neutral: "Neutrální" } as Record<string, string>)[entry.sentiment] ?? entry.sentiment}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                  <span className={`w-1.5 h-1.5 rounded-full ${entry.type === "order" && entry.outcome === "completed" ? "bg-emerald-500" : "bg-zinc-400"}`} />
                  {entry.type === "call" ? getCallOutcomeLabel(entry.outcome) : getOrderOutcomeLabel(entry.outcome)}
                  {entry.type === "order" && typeof entry.amount === "number" && (
                    <span className="font-mono text-zinc-200">({formatCurrencyAmount(entry.amount, entry.currency ?? "USD")})</span>
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
