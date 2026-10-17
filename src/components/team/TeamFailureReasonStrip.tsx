"use client";

import { BarChart3 } from "lucide-react";
import type { FailureReasonRanking } from "@/lib/failureReasonRanking";
import { StatusAlert } from "@/components/ui/Status";

interface TeamFailureReasonStripProps {
  /** Null when the calls source is unavailable — never faked with zeros. */
  ranking: FailureReasonRanking | null;
  periodLabel?: string;
}

/**
 * Žebříček top důvodů neúspěchu za zvolené období. Pouze pro hovorům, které
 * skončily neúspěchem (`outcome='objection'`), a jen za týmový rozsah definovaný
 * v checkpointu.
 */
export function TeamFailureReasonStrip({ ranking, periodLabel }: TeamFailureReasonStripProps) {
  if (ranking === null) {
    return (
      <StatusAlert tone="neutral" role="status">
        Důvody neúspěchu nejsou dostupné.
      </StatusAlert>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4" aria-labelledby="failure-reasons-heading">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        <h3 id="failure-reasons-heading" className="text-sm font-semibold text-zinc-100">Důvody neúspěchu</h3>
      </div>

      <p className="text-[11px] text-zinc-500">
        {ranking.total === 0
          ? `V ${periodLabel ? `období „${periodLabel.toLowerCase()}“` : "zvoleném období"} tým nemá žádné neúspěšné hovory.`
          : `Žebříček neúspěchů z ${ranking.total} hovorů v ${periodLabel ? `období „${periodLabel.toLowerCase()}“` : "zvoleném období"}.`}
      </p>

      {ranking.total === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
          Neexistují žádné záznamy důvodů neúspěchu.
        </div>
      ) : (
        <div className="space-y-3">
          {ranking.reasons.map((reason) => (
            <div key={reason.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-zinc-300">{reason.label}</span>
                <span className="text-[11px] text-zinc-500">
                  {reason.count} · {reason.percent}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-400"
                  style={{ width: `${reason.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
