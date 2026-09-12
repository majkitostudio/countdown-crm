"use client";

import { useEffect, useState } from "react";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { formatCurrencyAmounts } from "@/lib/currency";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert } from "@/components/ui/Status";

export function KpiCards({ compact = false }: { compact?: boolean }) {
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
            message: error instanceof Error ? error.message : "Analytics data could not be loaded.",
          });
        }
      }
    }

    void loadKpis();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      {result && !result.ok && (
        <StatusAlert tone="danger">
          {result.code === "FORBIDDEN" ? "Analytics forbidden: " : "Analytics unavailable: "}{result.message}
        </StatusAlert>
      )}
      {result === null ? (
        <StatusAlert tone="neutral" role="status">
          Loading workspace analytics...
        </StatusAlert>
      ) : result.ok ? (
      <div className={`grid grid-cols-2 gap-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-4 sm:gap-6"}`}>
        {[
          { id: "calls", label: "Team Calls", value: String(result.data.totalCalls), detail: "all workspace calls" },
          { id: "conversion", label: "Team Conversion Rate", value: `${result.data.conversionRate.toFixed(1)}%`, detail: "team orders / calls" },
          { id: "revenue", label: "Team Revenue", value: formatCurrencyAmounts(result.data.revenueByCurrency), detail: "team completed orders; currencies separate" },
          { id: "operators", label: "Operators in Workspace", value: "—", detail: "team presence unavailable" },
        ].map((kpi) => <MetricCard key={kpi.id} label={kpi.label} value={kpi.value} detail={kpi.detail} />)}
      </div>
      ) : null}
    </div>
  );
}
