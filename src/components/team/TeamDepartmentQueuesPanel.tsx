"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Layers, Eye } from "lucide-react";
import type { QueueItemDTO } from "@/lib/dal/leadQueue";
import type { DepartmentQueueOverview } from "@/lib/departmentQueues";
import type { DepartmentKey } from "@/lib/department";
import { describeQueueReason, type QueueReasonKind } from "@/lib/queueReason";
import { Surface } from "@/components/ui/Surface";
import { StatusAlert } from "@/components/ui/Status";

interface TeamDepartmentQueuesPanelProps {
  overview: DepartmentQueueOverview;
  queueItems: QueueItemDTO[];
  queueState: "ready" | "unavailable";
  /** Department the panel opens with selected (e.g. when opened from a P4 card). */
  initialDepartment?: DepartmentFilter;
}

type DepartmentFilter = "all" | DepartmentKey | "unattributed";

const STATE_LABELS: Record<QueueItemDTO["state"], string> = {
  available: "Čeká",
  assigned: "Přiřazeno",
  in_progress: "Probíhá hovor",
  awaiting_outcome: "Čeká na výsledek",
  waiting_callback: "Naplánovaný hovor",
  closed: "Uzavřeno",
  paused: "Pozastaveno",
};

const UNATTRIBUTED_LABEL = "Bez oddělení";

const REASON_TONES: Record<QueueReasonKind, string> = {
  rescue: "border-amber-800/60 bg-amber-950/30 text-amber-200",
  retention: "border-sky-900/60 bg-sky-950/30 text-sky-200",
};

function formatSince(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={warning && value > 0
        ? "mt-1 font-mono text-lg font-semibold text-amber-300"
        : "mt-1 font-mono text-lg font-semibold text-zinc-100"}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Manager-facing overview of the P1–P4 queues: a summary card per department
 * plus the leads currently sitting in the queue. The department of a lead comes
 * from its team; leads whose team matches no department are shown as
 * "Bez oddělení" so nothing disappears silently.
 */
export function TeamDepartmentQueuesPanel({ overview, queueItems, queueState, initialDepartment = "all" }: TeamDepartmentQueuesPanelProps) {
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>(initialDepartment);
  const [stateFilter, setStateFilter] = useState<"all" | QueueItemDTO["state"]>("all");

  const departmentByTeamId = useMemo(() => {
    const map = new Map<string, DepartmentKey>();
    for (const department of overview.departments) {
      for (const team of department.teams) {
        map.set(team.id, department.key);
      }
    }
    return map;
  }, [overview.departments]);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const department of overview.departments) {
      for (const team of department.teams) {
        map.set(team.id, team.name);
      }
    }
    return map;
  }, [overview.departments]);

  const rows = useMemo(
    () => queueItems.map((item) => ({
      item,
      departmentKey: item.team_id ? departmentByTeamId.get(item.team_id) ?? null : null,
      reason: describeQueueReason(item.last_outcome),
    })),
    [queueItems, departmentByTeamId],
  );

  const visibleRows = useMemo(
    () => rows.filter(({ item, departmentKey }) => {
      const matchesDepartment = departmentFilter === "all"
        || (departmentFilter === "unattributed" ? departmentKey === null : departmentKey === departmentFilter);
      const matchesState = stateFilter === "all" || item.state === stateFilter;
      return matchesDepartment && matchesState;
    }),
    [rows, departmentFilter, stateFilter],
  );

  const hasFilters = departmentFilter !== "all" || stateFilter !== "all";

  const toggleDepartment = (next: DepartmentFilter) => {
    setDepartmentFilter((current) => (current === next ? "all" : next));
  };

  const showUnattributed = overview.unattributed.total > 0;

  return (
    <Surface variant="page">
      <div className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <Layers className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-zinc-100">Queues</h2>
        </div>
        <p className="-mt-3 text-xs leading-relaxed text-zinc-500">
          Přehled front podle oddělení P1–P4. Ukazuje, kolik práce v každém oddělení čeká a v jakém je stavu.
          Department je typ práce, tým (např. P1K) je skupina operátorů pod ním.
        </p>

        <section aria-label="Souhrn oddělení" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overview.departments.map((department) => {
            const selected = departmentFilter === department.key;
            return (
              <button
                key={department.key}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleDepartment(department.key)}
                className={selected
                  ? "rounded-xl border border-zinc-600 bg-zinc-900 p-4 text-left transition-colors"
                  : "rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition-colors hover:border-zinc-700"}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-zinc-950">
                    {department.key}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">{department.total} ve frontě</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-100">{department.name}</h3>
                <p className="mt-1 min-h-10 text-[11.5px] leading-relaxed text-zinc-500">{department.purpose}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {department.teams.length === 0
                    ? <span className="text-[10px] text-zinc-600">Žádné týmy</span>
                    : department.teams.map((team) => (
                      <span key={team.id} className="rounded-md border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                        {team.name}
                      </span>
                    ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
                  <Metric label="Čeká" value={department.waiting} />
                  <Metric label="V řešení" value={department.inProgress} />
                  <Metric label="Naplánované" value={department.callbacks} />
                  <Metric label="Po termínu" value={department.overdueCallbacks} warning />
                </div>
              </button>
            );
          })}
        </section>

        {showUnattributed && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">
            <span>{overview.unattributed.total} položek fronty nejde přiřadit žádnému oddělení (chybí tým nebo nerozpoznaný název).</span>
            <button
              type="button"
              onClick={() => toggleDepartment("unattributed")}
              aria-pressed={departmentFilter === "unattributed"}
              className={departmentFilter === "unattributed"
                ? "rounded-full bg-amber-200 px-2.5 py-1 font-medium text-amber-950"
                : "rounded-full border border-amber-800 px-2.5 py-1 text-amber-200 hover:border-amber-600"}
            >
              Zobrazit: {UNATTRIBUTED_LABEL}
            </button>
          </div>
        )}

        <div>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <h3 className="text-sm font-semibold text-zinc-100">Leady ve frontě</h3>
            <p className="text-[11px] text-zinc-500">Zobrazeno {visibleRows.length} z {queueItems.length}</p>
          </div>

          <div className="mt-3 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:grid-cols-2">
            <label className="text-xs text-zinc-500">
              Department
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value as DepartmentFilter)}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="all">Všechna oddělení</option>
                {overview.departments.map((department) => (
                  <option key={department.key} value={department.key}>{department.key} — {department.name}</option>
                ))}
                <option value="unattributed">{UNATTRIBUTED_LABEL}</option>
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Stav
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              >
                <option value="all">Všechny stavy</option>
                {Object.entries(STATE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setDepartmentFilter("all"); setStateFilter("all"); }}
                className="text-left text-xs text-zinc-400 hover:text-zinc-100 sm:col-span-2"
              >
                Zrušit filtry
              </button>
            )}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            Sloupec <span className="text-zinc-400">Důvod</span> ukazuje, proč lead do oddělení přišel
            (námitka, vrácený balíček, balíček na výdejně, retence). Pomlčka „—“ znamená, že důvod přesunu
            nebyl u leadu zaznamenán.
          </p>

          {queueState === "unavailable" ? (
            <div className="mt-3">
              <StatusAlert tone="neutral" role="status">Týmová fronta není dostupná.</StatusAlert>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-xs text-zinc-500">
              Ve frontě nic nečeká.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full min-w-240 text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Tým</th>
                    <th className="px-4 py-3">Stav</th>
                    <th className="px-4 py-3">Důvod</th>
                    <th className="px-4 py-3">Přiřazený operátor</th>
                    <th className="px-4 py-3">Ve frontě od</th>
                    <th className="px-4 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {visibleRows.map(({ item, departmentKey, reason }) => (
                    <tr key={item.id} className="align-top hover:bg-zinc-900/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-200">{item.lead?.full_name || "Kontakt není v tomto rozsahu dostupný"}</div>
                        <div className="mt-1 text-[11px] text-zinc-500">{item.lead?.phone || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                          {departmentKey ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {item.team_id ? teamNameById.get(item.team_id) ?? UNATTRIBUTED_LABEL : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-300">
                          {STATE_LABELS[item.state]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {reason ? (
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${REASON_TONES[reason.kind]}`}>
                            {reason.label}
                          </span>
                        ) : (
                          <span className="text-zinc-600" title="Důvod přesunu nebyl zaznamenán">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {item.assigned_operator?.full_name || <span className="text-zinc-600">Volný pool</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{formatSince(item.available_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/leads/${item.lead_id}`} className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100">
                          <Eye className="h-3.5 w-3.5" /> Otevřít <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
}
