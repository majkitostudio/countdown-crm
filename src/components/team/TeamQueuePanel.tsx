"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Eye, RotateCcw, Send, Unlock, XCircle } from "lucide-react";
import {
  reassignLeadAssignmentAction,
  releaseLeadAssignmentAction,
  reopenLeadAssignmentAction,
} from "@/app/actions/leadQueue";
import type { QueueItemDTO } from "@/lib/dal/leadQueue";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";
import type { TeamMutationHandler } from "@/components/team/TeamPageContent";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { getScheduledCallAttention, isOverdueScheduledCall } from "@/lib/scheduleAttention";

interface TeamQueuePanelProps {
  queueItems: QueueItemDTO[];
  operators: WorkspaceMemberDTO[];
  operatorsState: "ready" | "unavailable";
  onMutation: TeamMutationHandler;
}

const STATE_LABELS: Record<QueueItemDTO["state"], string> = {
  available: "Volná fronta",
  assigned: "Přiřazeno",
  in_progress: "Probíhá",
  awaiting_outcome: "Výsledek / obnova",
  scheduled: "Naplánovaný hovor",
  closed: "Uzavřeno",
  paused: "Pozastaveno",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TeamQueuePanel({ queueItems, operators, operatorsState, onMutation }: TeamQueuePanelProps) {
  const scheduledCallAttention = getScheduledCallAttention(queueItems);
  const [selectedOperators, setSelectedOperators] = useState<Record<string, string>>({});
  const [stateFilter, setStateFilter] = useState<"all" | QueueItemDTO["state"]>("all");
  const [operatorFilter, setOperatorFilter] = useState("all");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const runAction = async (itemId: string, action: () => Promise<unknown>, success: string) => {
    setBusyItemId(itemId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onMutation(action);
      setSuccessMessage(success);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Akci ve frontě se nepodařilo dokončit.");
    } finally {
      setBusyItemId(null);
    }
  };

  const visibleQueueItems = useMemo(
    () => queueItems.filter((item) => {
      const matchesState = stateFilter === "all" || item.state === stateFilter;
      const matchesOperator = operatorFilter === "all" || item.assigned_operator_id === operatorFilter;
      return matchesState && matchesOperator;
    }),
    [operatorFilter, queueItems, stateFilter],
  );
  const hasFilters = stateFilter !== "all" || operatorFilter !== "all";

  const reassign = (item: QueueItemDTO) => {
    if (operatorsState === "unavailable") return;
    const operatorId = selectedOperators[item.id];
    if (!operatorId || !operators.some((operator) => operator.user_id === operatorId)) {
      setErrorMessage("Vyberte cílového Operátora.");
      return;
    }

    void runAction(
      item.id,
      () => reassignLeadAssignmentAction(item.id, operatorId, "Team Leader reassignment"),
      "Lead byl přiřazen vybranému Operátorovi.",
    );
  };

  return (
    <Surface variant="page">
      <div className="space-y-4 p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <Send className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Správa fronty leadů</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Serverem řízená fronta. Operátor vidí pouze svůj aktuální kontakt; zde může vedoucí týmu nebo administrátor provést auditovaný zásah.
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] font-mono text-zinc-400">
          Položky fronty: {queueItems.length}
        </span>
      </div>

      <section className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:grid-cols-3" data-testid="team-scheduled-call-attention" aria-label="Naplánované hovory">
        <ScheduledCallMetric label="Naplánované hovory" value={scheduledCallAttention.total} />
        <ScheduledCallMetric label="Naplánované později" value={scheduledCallAttention.scheduled} />
        <ScheduledCallMetric label="Po termínu" value={scheduledCallAttention.overdue} tone={scheduledCallAttention.overdue > 0 ? "warning" : "neutral"} />
        <p className="sm:col-span-3 text-[11px] leading-relaxed text-zinc-500">Původní operátor má přednost. Pokud není dostupný, může si naplánovaný hovor převzít volný operátor ze stejného týmu.</p>
      </section>

      {successMessage && <StatusAlert tone="success" role="status">{successMessage}</StatusAlert>}
      {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}
      {operatorsState === "unavailable" && <StatusAlert tone="neutral" role="status">Operátoři pracovního prostoru nejsou dostupní.</StatusAlert>}

      <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:grid-cols-2">
        <label className="text-xs text-zinc-500">
          Stav fronty
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
            <option value="all">Všechny stavy</option>
            {Object.entries(STATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Přiřazený operátor
          <select value={operatorFilter} onChange={(event) => setOperatorFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
            <option value="all">Všichni operátoři</option>
            {operators.map((operator) => <option key={operator.user_id} value={operator.user_id}>{operator.full_name}</option>)}
          </select>
        </label>
        {hasFilters && (
          <button type="button" onClick={() => { setStateFilter("all"); setOperatorFilter("all"); }} className="inline-flex items-center gap-1.5 text-left text-xs text-zinc-400 hover:text-zinc-100 sm:col-span-2">
            Zrušit filtry
          </button>
        )}
      </div>
      <p className="text-[11px] text-zinc-600">Zobrazeno {visibleQueueItems.length} z {queueItems.length} položek fronty.</p>

      {visibleQueueItems.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-xs text-zinc-500">
          Fronta je prázdná. Žádná náhradní přiřazení nebyla vytvořena.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
          <table className="w-full min-w-245 text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Stav</th>
                <th className="px-4 py-3">Přiřazený operátor</th>
                <th className="px-4 py-3">Dostupnost / plán</th>
                <th className="px-4 py-3 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {visibleQueueItems.map((item) => {
                const isBusy = busyItemId === item.id;
                const canRelease = item.state === "assigned" || item.state === "awaiting_outcome" || item.state === "paused";
                const canReassign = item.state === "available" || item.state === "assigned" || item.state === "scheduled";
                const canReopen = item.state === "closed";
                const overdueScheduledCall = isOverdueScheduledCall(item);
                return (
                  <tr key={item.id} className="align-top hover:bg-zinc-900/70">
                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-200">{item.lead?.full_name || "Kontakt není v tomto rozsahu dostupný"}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">{item.lead?.phone || "—"}</div>
                      {item.lead && <Link href={`/leads/${item.lead_id}`} className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100">
                        <Eye className="h-3.5 w-3.5" /> Zobrazit kontakt <ArrowRight className="h-3 w-3" />
                      </Link>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${item.state === "in_progress" ? "border-rose-900/70 bg-rose-950/30 text-rose-300" : item.state === "closed" ? "border-zinc-700 bg-zinc-900 text-zinc-500" : "border-zinc-700 bg-zinc-950 text-zinc-300"}`}>
                        {STATE_LABELS[item.state]}
                      </span>
                      <div className="mt-2 font-mono text-[10px] text-zinc-600">Pokusy: {item.attempt_count}</div>
                      {overdueScheduledCall && <div className="mt-2 text-[10px] font-medium text-amber-300">Po termínu</div>}
                    </td>
                    <td className="px-4 py-4 text-zinc-300">
                      {item.assigned_operator?.full_name || <span className="text-zinc-600">Volná fronta</span>}
                      {item.preferred_operator && <div className="mt-1 text-[10px] text-zinc-500">Preferovaný operátor: {item.preferred_operator.full_name}</div>}
                    </td>
                    <td className="px-4 py-4 font-mono text-[10px] text-zinc-500">
                      <div>{formatDate(item.available_at)}</div>
                      {item.scheduled_at && <div className="mt-1">Naplánováno: {formatDate(item.scheduled_at)}</div>}
                      {item.lease_expires_at && <div className="mt-1 text-amber-500/80">Rezervace do: {formatDate(item.lease_expires_at)}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-stretch gap-2">
                        {canReassign && (
                          <div className="flex items-center gap-2">
                            <SelectField
                              value={selectedOperators[item.id] || ""}
                              onChange={(event) => setSelectedOperators((current) => ({ ...current, [item.id]: event.target.value }))}
                              disabled={isBusy || operatorsState === "unavailable" || operators.length === 0}
                              className="w-full"
                              aria-label={`Změnit přiřazení: ${item.lead?.full_name || "položka fronty"}`}
                            >
                              <option value="">Přiřadit operátorovi…</option>
                              {operators.map((operator) => <option key={operator.user_id} value={operator.user_id}>{operator.full_name}</option>)}
                            </SelectField>
                            <Button variant="secondary" disabled={isBusy || !selectedOperators[item.id]} onClick={() => reassign(item)}>Přiřadit</Button>
                          </div>
                        )}
                        <div className="flex flex-wrap justify-end gap-2">
                          {canRelease && <Button variant="secondary" disabled={isBusy} onClick={() => void runAction(item.id, () => releaseLeadAssignmentAction(item.id, "Team Leader release"), "Přiřazení bylo uvolněno do volné fronty.")}><Unlock className="h-3.5 w-3.5" /> Uvolnit</Button>}
                          {canReopen && <Button variant="secondary" disabled={isBusy} onClick={() => void runAction(item.id, () => reopenLeadAssignmentAction(item.id, "Team Leader reopen"), "Uzavřený lead byl znovu otevřen ve frontě.")}><RotateCcw className="h-3.5 w-3.5" /> Znovu otevřít</Button>}
                          {item.state === "in_progress" && <span className="inline-flex items-center gap-1 rounded-lg border border-rose-900/50 px-2.5 py-2 text-[11px] text-rose-300"><XCircle className="h-3.5 w-3.5" /> Probíhající hovor je uzamčen</span>}
                          {item.state === "awaiting_outcome" && <span className="inline-flex items-center gap-1 rounded-lg border border-amber-900/50 px-2.5 py-2 text-[11px] text-amber-300"><XCircle className="h-3.5 w-3.5" /> Čeká na obnovu / výsledek</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </Surface>
  );
}

function ScheduledCallMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warning" }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={tone === "warning" ? "mt-1 font-mono text-lg font-semibold text-amber-200" : "mt-1 font-mono text-lg font-semibold text-zinc-100"}>{value}</p>
    </div>
  );
}
