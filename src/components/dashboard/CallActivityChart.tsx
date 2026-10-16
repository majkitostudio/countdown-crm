"use client";

import { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, AnalyticsOverview } from "@/lib/analytics";
import { createEmptyCallActivity } from "@/lib/callActivity";
import { StatusAlert } from "@/components/ui/Status";

const CHART_COLOR = "#a1a1aa";

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * Daily call volume and hourly activity for the Reports overview. Reads the
 * same server-authorized analytics payload as the neighbouring cards, so the
 * numbers only ever come from persisted `calls` rows — with no data the card
 * stays neutral instead of rendering synthetic bars.
 */
export function CallActivityChart() {
  const [result, setResult] = useState<AnalyticsActionResult<AnalyticsOverview> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCallActivity() {
      try {
        const analyticsResult = await getAnalyticsDataAction();
        if (!cancelled) setResult(analyticsResult);
      } catch (error) {
        if (!cancelled) {
          setResult({
            ok: false,
            code: "UNAVAILABLE",
            status: 503,
            message: error instanceof Error ? error.message : "Call activity query failed",
          });
        }
      }
    }

    void loadCallActivity();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = result === null;
  const isForbidden = result?.ok === false && result.code === "FORBIDDEN";
  const activity = result?.ok ? result.data.callActivity : createEmptyCallActivity();
  const hasCalls = activity.totalCalls > 0;
  const scopeLabel = result?.ok ? (result.data.scope === "team" ? "Týmová data" : "Celý workspace") : "";

  return (
    <div
      className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-5"
      data-testid="call-activity-chart"
      data-call-activity-status={
        isLoading ? "loading" : result?.ok === false ? (isForbidden ? "forbidden" : "unavailable") : hasCalls ? "ready" : "empty"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Call Volume &amp; Hourly Activity</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider shrink-0">
          {isLoading ? "Načítání" : `${activity.periodDays} dní • ${scopeLabel}`}
        </span>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 text-xs text-zinc-400">
          Načítám aktivitu hovorů…
        </div>
      ) : result && !result.ok ? (
        <StatusAlert tone={isForbidden ? "neutral" : "danger"}>
          <p className="text-xs font-medium">
            {isForbidden ? "Přístup k aktivitě hovorů je omezen" : "Aktivita hovorů není dostupná"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">{result.message}</p>
        </StatusAlert>
      ) : !hasCalls ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-200">Za posledních {activity.periodDays} dní nejsou uložené žádné hovory</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Graf se naplní automaticky, jakmile se v databázi calls objeví hovory za toto období.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 px-1">
            <span className="text-2xl font-semibold text-zinc-100 font-mono">{activity.totalCalls}</span>
            <span className="text-[11px] text-zinc-400">uložených hovorů za období ({activity.periodStart} → {activity.periodEnd}, UTC)</span>
          </div>

          <div className="space-y-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Call volume po dnech</p>
            <div className="h-28 rounded-lg bg-zinc-950/60 border border-zinc-800/60 px-1 py-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity.daily} margin={{ top: 2, right: 4, bottom: 0, left: -22 }}>
                  <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(244, 244, 245, 0.04)" }}
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value) => [value, "Hovory"]}
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as { date?: string } | undefined;
                      return point?.date ? `${label} ${point.date}` : String(label);
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 px-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Hodinová aktivita</p>
              <p className="text-[10px] text-zinc-500">
                {activity.peakHour !== null ? `Nejrušnější: ${formatHour(activity.peakHour)} UTC` : "Bez dat"}
              </p>
            </div>
            <div className="h-28 rounded-lg bg-zinc-950/60 border border-zinc-800/60 px-1 py-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity.hourly} margin={{ top: 2, right: 4, bottom: 0, left: -22 }}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatHour}
                    interval={3}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(244, 244, 245, 0.04)" }}
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value) => [value, "Hovory"]}
                    labelFormatter={(label) => `${formatHour(Number(label))} UTC`}
                  />
                  <Bar dataKey="count" fill={CHART_COLOR} radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/40">
            Zdroj: tabulka calls (uložené časové značky, UTC). Hodiny odpovídají uloženému času hovoru.
          </p>
        </>
      )}
    </div>
  );
}
