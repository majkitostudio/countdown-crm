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

  const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";

  return (
    <div className="space-y-3">
      {result && !result.ok && (
        <StatusAlert tone={feedbackTone}>
          {result.code === "FORBIDDEN" ? "Analytics access is restricted: " : "Analytics unavailable: "}{result.message}
        </StatusAlert>
      )}
      {result === null ? (
        <StatusAlert tone="neutral" role="status">
          Loading workspace analytics...
        </StatusAlert>
      ) : result.ok ? (
      <div className={`grid grid-cols-2 gap-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-4 sm:gap-6"}`}>
        {[
          { id: "calls", label: scope === "team" ? "Team Calls" : "Workspace Calls", value: String(result.data.totalCalls), detail: scope === "team" ? "all calls in your team" : "all calls in the workspace" },
          { id: "conversion", label: scope === "team" ? "Team Conversion Rate" : "Workspace Conversion Rate", value: `${result.data.conversionRate.toFixed(1)}%`, detail: scope === "team" ? "team orders / calls" : "workspace orders / calls" },
          { id: "revenue", label: scope === "team" ? "Team Revenue" : "Workspace Revenue", value: formatCurrencyAmounts(result.data.revenueByCurrency), detail: scope === "team" ? "team completed orders; currencies separate" : "workspace completed orders; currencies separate" },
          { id: "operators", label: scope === "team" ? "Operators in Team" : "Operators in Workspace", value: "—", detail: scope === "team" ? "team presence unavailable" : "workspace presence unavailable" },
        ].map((kpi) => <MetricCard key={kpi.id} label={kpi.label} value={kpi.value} detail={kpi.detail} />)}
      </div>
      ) : null}
    </div>
  );
}
