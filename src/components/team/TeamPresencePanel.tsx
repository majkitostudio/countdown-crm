"use client";

import { useMemo, useState } from "react";
import { Activity, Clock3, RotateCcw } from "lucide-react";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";
import type { OperatorPresenceDTO } from "@/lib/dal/operatorPresence";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface TeamPresencePanelProps {
  operators: WorkspaceMemberDTO[];
  presence: OperatorPresenceDTO[];
}

const STATE_LABELS: Record<OperatorPresenceDTO["state"], string> = {
  offline: "Offline",
  available: "Ready",
  break: "Break",
  in_call: "In call",
  after_call: "After call",
};

function isFresh(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now() - 5 * 60 * 1000;
}

function formatDate(value: string | null): string {
  if (!value) return "No signal recorded";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusTone(state: OperatorPresenceDTO["state"], fresh: boolean): "success" | "warning" | "neutral" | "danger" {
  if (!fresh || state === "offline") return "neutral";
  if (state === "available") return "success";
  if (state === "break" || state === "after_call") return "warning";
  return "danger";
}

export function TeamPresencePanel({ operators, presence }: TeamPresencePanelProps) {
  const presenceByOperator = useMemo(() => new Map(presence.map((entry) => [entry.operator_id, entry])), [presence]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | OperatorPresenceDTO["state"]>("all");
  const normalizedSearch = search.trim().toLocaleLowerCase("cs-CZ");
  const visibleOperators = useMemo(
    () => operators.filter((operator) => {
      const entry = presenceByOperator.get(operator.user_id);
      const state = entry?.state || "offline";
      const matchesState = stateFilter === "all" || state === stateFilter;
      const matchesSearch = !normalizedSearch || `${operator.full_name} ${operator.email || ""}`.toLocaleLowerCase("cs-CZ").includes(normalizedSearch);
      return matchesState && matchesSearch;
    }),
    [normalizedSearch, operators, presenceByOperator, stateFilter],
  );
  const hasFilters = search.trim().length > 0 || stateFilter !== "all";

  return (
    <Surface variant="page">
      <div className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 h-4 w-4 text-zinc-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Operator status</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Stav vychází z posledního signálu operátora. Signál starší než pět minut neoznačujeme jako aktuálně dostupný.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="text-xs text-zinc-500">
            Hledat operátora
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Jméno nebo e-mail" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600" />
          </label>
          <label className="text-xs text-zinc-500">
            Stav
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
              <option value="all">Všechny stavy</option>
              {Object.entries(STATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {hasFilters && (
            <button type="button" onClick={() => { setSearch(""); setStateFilter("all"); }} className="inline-flex items-center gap-1.5 text-left text-xs text-zinc-400 hover:text-zinc-100 sm:col-span-2">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Zrušit filtry
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-600">Zobrazeno {visibleOperators.length} z {operators.length} operátorů.</p>

        {visibleOperators.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-8 text-center text-xs text-zinc-500">Zvoleným filtrům neodpovídají žádní operátoři.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleOperators.map((operator) => {
              const entry = presenceByOperator.get(operator.user_id);
              const fresh = Boolean(entry && isFresh(entry.last_heartbeat_at));
              const state = entry?.state || "offline";
              return (
                <div key={operator.user_id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">{operator.full_name || operator.email || "Neznámý operátor"}</p>
                      <p className="mt-1 truncate text-[11px] text-zinc-500">{operator.email || "Email není uveden"}</p>
                    </div>
                    <StatusBadge tone={statusTone(state, fresh)}>{fresh ? STATE_LABELS[state] : "Offline / stale"}</StatusBadge>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500">
                    <Clock3 className="h-3.5 w-3.5 text-zinc-600" />
                    <span>{formatDate(entry?.last_heartbeat_at || null)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Surface>
  );
}
