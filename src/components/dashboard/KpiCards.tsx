"use client";

import { useEffect, useState } from "react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { formatCurrencyAmounts } from "@/lib/currency";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert } from "@/components/ui/Status";

export function KpiCards({ compact = false, scope = "workspace" }: { compact?: boolean; scope?: "team" | "workspace" }) {
  const [result, setResult] = useState<AnalyticsActionResult<AnalyticsOverview> | null>(null);

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
            message: error instanceof Error ? error.message : "Analytická data se nepodařilo načíst.",
          });
        }
      }
    }

    void loadKpis();
    return () => {
      cancelled = true;
    };
  }, []);

  const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";

  return (
    <div className="space-y-3 animate-in fade-in duration-150 ease-interface">
      {result && !result.ok && (
        <StatusAlert tone={feedbackTone}>
          {result.code === "FORBIDDEN" ? "Přístup k analytice je omezen: " : "Analytika není dostupná: "}{result.message}
        </StatusAlert>
      )}
      {result === null ? (
        <StatusAlert tone="neutral" role="status">
          Načítám analytiku pracovního prostoru…
        </StatusAlert>
      ) : result.ok ? (
      <div className={`grid grid-cols-2 gap-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-4 sm:gap-6"}`}>
        {[
          { id: "calls", label: scope === "team" ? "Hovory týmu" : "Hovory pracovního prostoru", value: String(result.data.totalCalls), detail: scope === "team" ? "všechny hovory týmu" : "všechny hovory pracovního prostoru" },
          { id: "conversion", label: scope === "team" ? "Konverze týmu" : "Konverze pracovního prostoru", value: `${result.data.conversionRate.toFixed(1)}%`, detail: scope === "team" ? "objednávky / hovory týmu" : "objednávky / hovory pracovního prostoru" },
          { id: "revenue", label: scope === "team" ? "Příjmy týmu" : "Příjmy pracovního prostoru", value: formatCurrencyAmounts(result.data.revenueByCurrency), detail: scope === "team" ? "dokončené objednávky týmu; měny odděleně" : "dokončené objednávky pracovního prostoru; měny odděleně" },
          { id: "operators", label: scope === "team" ? "Operátoři v týmu" : "Operátoři v pracovním prostoru", value: "-", detail: scope === "team" ? "dostupnost týmu není k dispozici" : "dostupnost pracovního prostoru není k dispozici" },
        ].map((kpi) => <MetricCard key={kpi.id} label={kpi.label} value={kpi.value} detail={kpi.detail} />)}
      </div>
      ) : null}
    </div>
  );
}
