"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Clock, PhoneCall, ShoppingBag, User } from "lucide-react";
import { getRecentActivityAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, RecentActivityResult } from "@/lib/analytics";
import { formatCurrencyAmount } from "@/lib/currency";
import { StatusAlert } from "@/components/ui/Status";
import { Button } from "@/components/ui/Button";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getCallOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "order_placed":
      return "Objednávka vytvořena";
    case "followup_scheduled":
      return "Naplánováno další volání";
    case "no_answer":
      return "Bez odpovědi";
    case "objection":
      return "Námitka";
    case "completed":
      return "Dokončeno";
    default:
      return outcome.replaceAll("_", " ");
  }
}

function getOrderOutcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    completed: "Dokončená objednávka",
    delivered: "Doručená objednávka",
    returned: "Vrácená objednávka",
    sent: "Odeslaná objednávka",
    cancelled: "Zrušená objednávka",
  };
  return labels[outcome] ?? `Objednávka · ${outcome.replaceAll("_", " ")}`;
}

export function RecentActivityFeed({ scope = "workspace" }: { scope?: "team" | "workspace" }) {
  const [activity, setActivity] = useState<RecentActivityResult>({ entries: [], sources: { calls: "ready", orders: "ready" } });
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AnalyticsActionResult<RecentActivityResult> | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
            message: error instanceof Error ? error.message : "Recent activity query failed",
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
  }, [retryKey]);

  const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";

  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
            Poslední aktivita · {scope === "team" ? "moje týmy" : "celý workspace"}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Uložené hovory a objednávky přiřazené k tomuto rozsahu
          </p>
        </div>

        <a
          href="/calls"
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
        >
          <span>Zobrazit všechny hovory</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Načítám poslední aktivitu" className="space-y-2.5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg border border-zinc-800/60 bg-zinc-950/60 motion-reduce:animate-none" />
          ))}
        </div>
      ) : result && !result.ok ? (
        <div className="space-y-3">
          <StatusAlert tone={feedbackTone}>
            <p className="text-xs font-medium">
              {result.code === "FORBIDDEN" ? "K poslední aktivitě nemáte přístup." : "Poslední aktivita není dostupná."}
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
      ) : activity.entries.length === 0 ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-200">{activity.sources.calls === "unavailable" || activity.sources.orders === "unavailable" ? "Část poslední aktivity není dostupná" : "Zatím tu není žádná aktivita"}</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            {activity.sources.calls === "unavailable" || activity.sources.orders === "unavailable" ? "Některý zdroj dat teď neodpovídá; jeho výpadek nezaměňujeme za prázdný seznam." : "Uložené hovory a objednávky se zde zobrazí po přiřazení operátorovi."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {(activity.sources.calls === "unavailable" || activity.sources.orders === "unavailable") && (
            <p role="status" className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">
              Část dat není dostupná: {activity.sources.calls === "unavailable" ? "hovory" : ""}{activity.sources.calls === "unavailable" && activity.sources.orders === "unavailable" ? " a " : ""}{activity.sources.orders === "unavailable" ? "objednávky" : ""}.
            </p>
          )}
          {activity.entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-zinc-700/80 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                  {entry.type === "call" ? <PhoneCall className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-100 truncate">{entry.customerName}</span>
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
                    {entry.sentiment}
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
