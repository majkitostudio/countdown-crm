"use client";

import { ArrowRight, Clock3 } from "lucide-react";
import type { QueueItemDTO } from "@/lib/dal/leadQueue";
import { buildQueueAging } from "@/lib/queueAging";
import { getMetricValueClassName } from "@/components/ui/MetricCard";
import { StatusAlert, type SemanticTone } from "@/components/ui/Status";

interface TeamQueueAgingStripProps {
  /** Null when the queue source is unavailable — never faked with zeros. */
  queueItems: QueueItemDTO[] | null;
  onOpenQueues?: () => void;
}

function formatAge(ageMs: number): string {
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  if (hours < 1) return "méně než hodinu";
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 den";
  if (days <= 4) return `${days} dny`;
  return `${days} dní`;
}

function formatLeadCount(count: number): string {
  if (count === 1) return "1 lead";
  if (count >= 2 && count <= 4) return `${count} leady`;
  return `${count} leadů`;
}

/**
 * Stárnutí fronty — odpovídá na otázku „co nám stárne a propadá“.
 * Rozpad čekajících leadů podle toho, jak dlouho už čekají, a nejstarší z nich.
 * Vychází ze stejné množiny jako souhrn front (stav `available`).
 */
export function TeamQueueAgingStrip({ queueItems, onOpenQueues }: TeamQueueAgingStripProps) {
  if (!queueItems) {
    return (
      <StatusAlert tone="neutral" role="status">
        Stárnutí fronty není dostupné.
      </StatusAlert>
    );
  }

  const summary = buildQueueAging(queueItems, new Date());
  const cards: Array<{ key: string; label: string; hint: string; value: number; tone: SemanticTone }> = [
    { key: "under24h", label: "Do 24 h", hint: "Čerstvě ve frontě", value: summary.buckets.under24h, tone: "neutral" },
    { key: "dayTo3", label: "1–3 dny", hint: "Začíná chladnout", value: summary.buckets.dayTo3, tone: "warning" },
    { key: "over3d", label: "3+ dny", hint: "Hrozí, že propadne", value: summary.buckets.over3d, tone: "danger" },
  ];

  return (
    <section aria-label="Stárnutí fronty">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Clock3 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-zinc-100">Stárnutí fronty</h2>
          {summary.oldest ? (
            <span className="text-[11px] text-zinc-500">
              Nejstarší čeká <span className="font-medium text-status-warning-text">{formatAge(summary.oldest.ageMs)}</span>
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500">{summary.waiting === 0 ? "Ve frontě nic nečeká." : "Nic není na čase."}</span>
          )}
        </div>
        {onOpenQueues && (
          <button
            type="button"
            onClick={onOpenQueues}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            Otevřít Queues <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const attention = card.value > 0 && card.tone !== "neutral";
          return (
            <div
              key={card.key}
              className={attention
                ? "rounded-xl border border-zinc-700 bg-zinc-950/70 p-4"
                : "rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"}
            >
              <p className={["font-mono text-2xl font-semibold leading-none", card.value > 0 ? getMetricValueClassName(card.tone) : "text-zinc-600"].join(" ")}>
                {card.value}
              </p>
              <p className="mt-2 text-xs font-medium text-zinc-300">{card.label}</p>
              <p className="mt-1 text-[10.5px] leading-snug text-zinc-500">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-zinc-500">
        Čeká celkem {formatLeadCount(summary.waiting)}
        {summary.deferred > 0 ? ` · ${summary.deferred} ještě není na čase (naplánované zařazení)` : ""}.
      </p>
    </section>
  );
}
