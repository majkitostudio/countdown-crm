"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { TeamRiskSummary } from "@/lib/teamRiskSummary";
import { StatusAlert } from "@/components/ui/Status";

interface TeamRiskSummaryStripProps {
  /** Null when the source is unavailable — never faked with zeros. */
  summary: TeamRiskSummary | null;
}

interface RiskCard {
  label: string;
  hint: string;
  value: number;
  tone: "critical" | "high" | "warning";
}

const TONE_VALUE_CLASS: Record<RiskCard["tone"], string> = {
  critical: "text-red-300",
  high: "text-amber-300",
  warning: "text-zinc-100",
};

/**
 * Operational risk strip for the Team Leader dashboard. Counts are derived from
 * the same rules as the Exception Queue, so a TL sees "what needs attention"
 * before scrolling into the per-operator checkpoint. It links to the Exception
 * Queue for the underlying list and only shows zero as a calm state when the
 * source is actually available.
 */
export function TeamRiskSummaryStrip({ summary }: TeamRiskSummaryStripProps) {
  if (!summary) {
    return (
      <StatusAlert tone="neutral" role="status">
        Rizika a prodlevy nejsou dostupné.
      </StatusAlert>
    );
  }

  const cards: RiskCard[] = [
    { label: "Hovor bez výsledku", hint: "Hovor skončil bez zapsaného výsledku", value: summary.outcomeRecovery, tone: "critical" },
    { label: "Naplánovaný hovor po termínu", hint: "Domluvený čas už uplynul", value: summary.overdueScheduledCalls, tone: "high" },
    { label: "Propadlé přiřazení", hint: "Operátorovi vypršela rezervace leadu", value: summary.expiredLeases, tone: "high" },
    { label: "Zásilka na výdejně — riziko", hint: "Od 2 dnů bez obvolání zákazníka", value: summary.pickupRiskWarning, tone: "warning" },
    { label: "Zásilka na výdejně — alarm", hint: "Od 3 dnů bez obvolání zákazníka", value: summary.pickupRiskAlarm, tone: "high" },
  ];

  return (
    <section aria-label="Rizika a prodlevy">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-zinc-100">Rizika a prodlevy</h2>
          {summary.total === 0 && <span className="text-[11px] text-zinc-500">Nic nehoří.</span>}
        </div>
        <Link
          href="/team/exceptions"
          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          Otevřít Exception Queue <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const attention = card.value > 0;
          return (
            <div
              key={card.label}
              className={attention
                ? "rounded-xl border border-zinc-700 bg-zinc-950/70 p-4"
                : "rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"}
            >
              <p className="font-mono text-2xl font-semibold leading-none">
                <span className={attention ? TONE_VALUE_CLASS[card.tone] : "text-zinc-600"}>{card.value}</span>
              </p>
              <p className="mt-2 text-xs font-medium text-zinc-300">{card.label}</p>
              <p className="mt-1 text-[10.5px] leading-snug text-zinc-500">{card.hint}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
