"use client";

import { Activity, ArrowRight } from "lucide-react";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";
import type { OperatorPresenceDTO } from "@/lib/dal/operatorPresence";
import { buildLiveOpsSummary, type LiveOpsCounts } from "@/lib/liveOpsSummary";
import { getMetricValueClassName } from "@/components/ui/MetricCard";
import { StatusAlert, type SemanticTone } from "@/components/ui/Status";

interface TeamLiveOpsStripProps {
  /** Null when either source is unavailable — never faked with zeros. */
  operators: WorkspaceMemberDTO[] | null;
  presence: OperatorPresenceDTO[] | null;
  onOpenOperators?: () => void;
}

const STATE_CARDS: Array<{ key: keyof LiveOpsCounts; label: string; hint: string; tone: SemanticTone }> = [
  { key: "available", label: "Volní", hint: "Může vzít hovor", tone: "success" },
  { key: "inCall", label: "V hovoru", hint: "Právě telefonuje", tone: "info" },
  { key: "afterCall", label: "Po hovoru", hint: "Dopisuje výsledek", tone: "warning" },
  { key: "break", label: "Pauza", hint: "Přestávka", tone: "warning" },
  { key: "offline", label: "Offline", hint: "Bez signálu / odhlášen", tone: "neutral" },
];

/**
 * Provoz na lince — odpovídá na otázku „kdo právě teď může vzít hovor".
 * Čísla vychází z posledního signálu operátora (stejná pravidla jako panel
 * „Operator status“). Když data nejsou dostupná, ukážeme to — nuly nedomýšlíme.
 */
export function TeamLiveOpsStrip({ operators, presence, onOpenOperators }: TeamLiveOpsStripProps) {
  if (!operators || !presence) {
    return (
      <StatusAlert tone="neutral" role="status">
        Provoz na lince není dostupný.
      </StatusAlert>
    );
  }

  const summary = buildLiveOpsSummary(
    operators.map((operator) => ({ operatorId: operator.user_id })),
    presence.map((entry) => ({
      operatorId: entry.operator_id,
      state: entry.state,
      lastHeartbeatAt: entry.last_heartbeat_at,
    })),
    new Date(),
  );

  return (
    <section aria-label="Provoz na lince">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-zinc-100">Provoz na lince teď</h2>
          {summary.total > 0 && summary.counts.available === 0 && (
            <span className="text-[11px] text-zinc-500">Nikdo volný.</span>
          )}
        </div>
        {onOpenOperators && (
          <button
            type="button"
            onClick={onOpenOperators}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            Aktivní operátoři <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {STATE_CARDS.map((card) => {
          const value = summary.counts[card.key];
          return (
            <div
              key={card.key}
              className={value > 0
                ? "rounded-xl border border-zinc-700 bg-zinc-950/70 p-4"
                : "rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"}
            >
              <p className={["font-mono text-2xl font-semibold leading-none", value > 0 ? getMetricValueClassName(card.tone) : "text-zinc-600"].join(" ")}>
                {value}
              </p>
              <p className="mt-2 text-xs font-medium text-zinc-300">{card.label}</p>
              <p className="mt-1 text-[10.5px] leading-snug text-zinc-500">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-zinc-500">
        {summary.total === 0
          ? "V tomto rozsahu nejsou žádní operátoři."
          : summary.staleSignals > 0
            ? `U ${summary.staleSignals} z ${summary.total} operátorů je signál starší než 5 minut — počítáme je jako offline.`
            : `Signály všech ${summary.total} operátorů v rozsahu jsou aktuální.`}
      </p>
    </section>
  );
}
