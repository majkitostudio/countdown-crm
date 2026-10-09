"use client";

import { useEffect, useState } from "react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { formatCurrencyAmounts } from "@/lib/currency";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert } from "@/components/ui/Status";
import { Button } from "@/components/ui/Button";

export function KpiCards({ compact = false, scope = "workspace" }: { compact?: boolean; scope?: "team" | "workspace" }) {
  const [result, setResult] = useState<AnalyticsActionResult<AnalyticsOverview> | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadKpis() {
      try {
        const analyticsResult = await getAnalyticsDataAction();
        if (cancelled) return;

        setResult(analyticsResult);
      } catch (error) {
        if (!cancelled) {
          setResult({
            ok: false,
            code: "UNAVAILABLE",
            status: 503,
            message: error instanceof Error ? error.message : "Analytics data could not be loaded.",
          });
        }
      }
    }

    void loadKpis();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";

  return (
    <div className="space-y-3">
      {result && !result.ok && (
        <div className="space-y-3">
          <StatusAlert tone={feedbackTone}>
            {result.code === "FORBIDDEN" ? "Přístup k analytice není povolen: " : "Analytický přehled není dostupný: "}{result.message}
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
      )}
      {result === null ? (
        <div role="status" aria-label="Načítám analytický přehled" className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl border border-zinc-800/60 bg-zinc-950/60 motion-reduce:animate-none" />
          ))}
        </div>
      ) : result.ok ? (
      <div className={`grid grid-cols-2 gap-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-4 sm:gap-6"}`}>
        {[
          { id: "calls", label: scope === "team" ? "Hovory · moje týmy" : "Hovory · celý workspace", value: String(result.data.totalCalls), detail: "Za celé dostupné období" },
          { id: "conversion", label: "Úspěšnost hovorů", value: `${result.data.conversionRate.toFixed(1)} %`, detail: "Objednávky ÷ hovory · celé období" },
          { id: "revenue", label: "Tržby", value: formatCurrencyAmounts(result.data.revenueByCurrency), detail: `Dokončené objednávky · ${scope === "team" ? "moje týmy" : "celý workspace"}` },
          { id: "operators", label: scope === "team" ? "Operátoři · moje týmy" : "Operátoři · celý workspace", value: "—", detail: "Online přítomnost není dostupná" },
        ].map((kpi) => <MetricCard key={kpi.id} label={kpi.label} value={kpi.value} detail={kpi.detail} />)}
      </div>
      ) : null}
    </div>
  );
}
