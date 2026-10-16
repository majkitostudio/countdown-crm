"use client";

import { ArrowRight, Layers } from "lucide-react";
import type { DepartmentQueueOverview } from "@/lib/departmentQueues";
import { StatusAlert } from "@/components/ui/Status";

interface TeamQueuesSummaryStripProps {
  /** Null when the source is unavailable — never faked with zeros. */
  overview: DepartmentQueueOverview | null;
  onOpenQueues: () => void;
}

interface SummaryCard {
  key: string;
  name: string;
  waiting: number;
  inProgress: number;
  scheduled: number;
  overdue: number;
  warning?: boolean;
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={
          warning && value > 0
            ? "mt-0.5 font-mono text-base font-semibold text-amber-300"
            : "mt-0.5 font-mono text-base font-semibold text-zinc-100"
        }
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Compact P1–P4 queue summary placed at the top of the Team Leader dashboard
 * (checkpoint view). It answers "how much work sits where" at a glance and
 * links to the full Queues view for filtering and the lead list. An
 * unavailable source shows a notice instead of fabricated zero counts.
 */
export function TeamQueuesSummaryStrip({ overview, onOpenQueues }: TeamQueuesSummaryStripProps) {
  if (!overview) {
    return (
      <StatusAlert tone="neutral" role="status">
        Přehled front oddělení není dostupný.
      </StatusAlert>
    );
  }

  const cards: SummaryCard[] = overview.departments.map((department) => ({
    key: department.key,
    name: department.name,
    waiting: department.waiting,
    inProgress: department.inProgress,
    scheduled: department.callbacks,
    overdue: department.overdueCallbacks,
  }));

  const showUnattributed = overview.unattributed.total > 0;

  return (
    <section aria-label="Fronty oddělení — souhrn">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Layers className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-zinc-100">Kolik práce kde čeká</h2>
        </div>
        <button
          type="button"
          onClick={onOpenQueues}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          Otevřít Queues <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-zinc-950">
                {card.key}
              </span>
              <span className="text-[11px] text-zinc-500">{card.name}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Metric label="Čeká" value={card.waiting} />
              <Metric label="V řešení" value={card.inProgress} />
              <Metric label="Naplánované" value={card.scheduled} />
              <Metric label="Po termínu" value={card.overdue} warning />
            </div>
          </div>
        ))}
      </div>

      {showUnattributed && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200">
          <span>
            {overview.unattributed.total} položek fronty není přiřazeno žádnému oddělení (chybí tým nebo nerozpoznaný název).
          </span>
          <button
            type="button"
            onClick={onOpenQueues}
            className="rounded-full border border-amber-800 px-2.5 py-1 text-amber-200 transition-colors hover:border-amber-600"
          >
            Zobrazit v Queues
          </button>
        </div>
      )}
    </section>
  );
}
