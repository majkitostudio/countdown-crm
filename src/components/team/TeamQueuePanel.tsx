"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, ListPlus, RotateCcw, Send, Unlock, XCircle } from "lucide-react";
import {
  listQueueItemsAction,
  queueLeadForOperatorAction,
  reassignLeadAssignmentAction,
  releaseLeadAssignmentAction,
  reopenLeadAssignmentAction,
} from "@/app/actions/leadQueue";
import type { QueueItemDTO } from "@/lib/dal/leadQueue";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";

interface TeamQueuePanelProps {
  initialQueueItems: QueueItemDTO[];
  operators: WorkspaceMemberDTO[];
}

const STATE_LABELS: Record<QueueItemDTO["state"], string> = {
  available: "Available pool",
  assigned: "Assigned",
  in_progress: "In progress",
  awaiting_outcome: "Outcome / recovery",
  waiting_callback: "Waiting callback",
  closed: "Closed",
  paused: "Paused",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TeamQueuePanel({ initialQueueItems, operators }: TeamQueuePanelProps) {
  const [queueItems, setQueueItems] = useState(initialQueueItems);
  const [selectedOperators, setSelectedOperators] = useState<Record<string, string>>({});
  const [selectedQueueItemIds, setSelectedQueueItemIds] = useState<string[]>([]);
  const [bulkOperatorId, setBulkOperatorId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshQueue = async () => {
    setQueueItems(await listQueueItemsAction());
  };

  const runAction = async (itemId: string, action: () => Promise<unknown>, success: string) => {
    setBusyItemId(itemId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await action();
      await refreshQueue();
      setSuccessMessage(success);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Queue action could not be completed.");
    } finally {
      setBusyItemId(null);
    }
  };

  const reassign = (item: QueueItemDTO) => {
    const operatorId = selectedOperators[item.id];
    if (!operatorId) {
      setErrorMessage("Vyberte cílového Operátora.");
      return;
    }

    void runAction(
      item.id,
      () => reassignLeadAssignmentAction(item.id, operatorId, "Manager reassignment"),
      "Lead byl přiřazen vybranému Operátorovi.",
    );
  };

  const queueSelected = async () => {
    if (!bulkOperatorId) {
      setErrorMessage("Vyberte cílového Operátora.");
      return;
    }

    const selectedItems = queueItems.filter((item) =>
      selectedQueueItemIds.includes(item.id) && (item.state === "available" || item.state === "waiting_callback"),
    );
    if (selectedItems.length === 0) {
      setErrorMessage("Vyberte alespoň jeden lead z dostupné fronty.");
      return;
    }

    setBulkBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const failures: string[] = [];
    let queuedCount = 0;
    try {
      for (const item of selectedItems) {
        try {
          await queueLeadForOperatorAction(item.id, bulkOperatorId, "Manager queue preparation");
          queuedCount += 1;
        } catch {
          failures.push(item.lead.full_name);
        }
      }
      await refreshQueue();
      setSelectedQueueItemIds([]);
      if (failures.length > 0) {
        setErrorMessage(`${queuedCount} leadů zařazeno. Nepodařilo se zařadit: ${failures.join(", ")}.`);
      } else {
        setSuccessMessage(`${queuedCount} leadů bylo zařazeno do preferované fronty Operátora.`);
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const queueableItemIds = queueItems
    .filter((item) => item.state === "available" || item.state === "waiting_callback")
    .map((item) => item.id);
  const allQueueableSelected = queueableItemIds.length > 0 && queueableItemIds.every((itemId) => selectedQueueItemIds.includes(itemId));

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <Send className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Lead Queue Operations</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Operátor má vždy jen jeden aktuální kontakt. „Queue next“ připraví libovolný počet dalších leadů pro stejného Operátora, aniž by se vytvořil druhý aktivní assignment.
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] font-mono text-zinc-400">
          {queueItems.length} queue item{queueItems.length === 1 ? "" : "s"}
        </span>
      </div>

      {successMessage && <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">{successMessage}</div>}
      {errorMessage && <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{errorMessage}</div>}

      {selectedQueueItemIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-sky-900/50 bg-sky-950/20 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs text-sky-200">
            <ListPlus className="h-4 w-4" />
            <span>{selectedQueueItemIds.length} leadů vybráno pro zařazení do fronty</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkOperatorId}
              onChange={(event) => setBulkOperatorId(event.target.value)}
              disabled={bulkBusy || operators.length === 0}
              className="min-w-[190px] rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[11px] text-zinc-300 disabled:opacity-50"
              aria-label="Queue selected leads for operator"
            >
              <option value="">Queue selected for…</option>
              {operators.map((operator) => <option key={operator.user_id} value={operator.user_id}>{operator.full_name}</option>)}
            </select>
            <button type="button" disabled={bulkBusy || !bulkOperatorId} onClick={() => void queueSelected()} className="inline-flex items-center gap-1 rounded-lg border border-sky-800/70 px-2.5 py-2 text-[11px] text-sky-200 hover:border-sky-700 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-40">
              <ListPlus className="h-3.5 w-3.5" /> Queue selected
            </button>
          </div>
        </div>
      )}

      {queueItems.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-xs text-zinc-500">
          Queue is empty. No assignment data was fabricated.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allQueueableSelected}
                    onChange={(event) => setSelectedQueueItemIds(event.target.checked ? queueableItemIds : [])}
                    disabled={bulkBusy || queueableItemIds.length === 0}
                    aria-label="Select all queueable leads"
                    className="h-3.5 w-3.5 accent-sky-500"
                  />
                </th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Assigned Operator</th>
                <th className="px-4 py-3">Available / callback</th>
                <th className="px-4 py-3 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {queueItems.map((item) => {
                const isBusy = busyItemId === item.id || bulkBusy;
                const canRelease = item.state === "assigned" || item.state === "awaiting_outcome" || item.state === "paused";
                const canQueue = item.state === "available" || item.state === "waiting_callback";
                const canReassign = item.state === "assigned";
                const canReopen = item.state === "closed";
                return (
                  <tr key={item.id} className="align-top hover:bg-zinc-900/70">
                    <td className="px-4 py-4">
                      {canQueue && (
                        <input
                          type="checkbox"
                          checked={selectedQueueItemIds.includes(item.id)}
                          onChange={(event) => setSelectedQueueItemIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                          disabled={isBusy}
                          aria-label={`Select ${item.lead.full_name} for queueing`}
                          className="h-3.5 w-3.5 accent-sky-500"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-200">{item.lead.full_name}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">{item.lead.phone}</div>
                      <Link href={`/leads/${item.lead_id}`} className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100">
                        <Eye className="h-3.5 w-3.5" /> View contact <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${item.state === "in_progress" ? "border-rose-900/70 bg-rose-950/30 text-rose-300" : item.state === "closed" ? "border-zinc-700 bg-zinc-900 text-zinc-500" : "border-zinc-700 bg-zinc-950 text-zinc-300"}`}>
                        {STATE_LABELS[item.state]}
                      </span>
                      <div className="mt-2 font-mono text-[10px] text-zinc-600">Attempts: {item.attempt_count}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-300">
                      {item.assigned_operator?.full_name || <span className="text-zinc-600">Available pool</span>}
                      {item.preferred_operator && <div className="mt-1 text-[10px] text-zinc-500">Preferred: {item.preferred_operator.full_name}</div>}
                    </td>
                    <td className="px-4 py-4 font-mono text-[10px] text-zinc-500">
                      <div>{formatDate(item.available_at)}</div>
                      {item.scheduled_at && <div className="mt-1">Callback: {formatDate(item.scheduled_at)}</div>}
                      {item.lease_expires_at && <div className="mt-1 text-amber-500/80">Lease: {formatDate(item.lease_expires_at)}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-stretch gap-2">
                        {canQueue && (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedOperators[item.id] || ""}
                              onChange={(event) => setSelectedOperators((current) => ({ ...current, [item.id]: event.target.value }))}
                              disabled={isBusy || bulkBusy || operators.length === 0}
                              className="min-w-[170px] rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[11px] text-zinc-300 disabled:opacity-50"
                              aria-label={`Queue ${item.lead.full_name} for operator`}
                            >
                              <option value="">Queue next for…</option>
                              {operators.map((operator) => <option key={operator.user_id} value={operator.user_id}>{operator.full_name}</option>)}
                            </select>
                            <button type="button" disabled={isBusy || bulkBusy || !selectedOperators[item.id]} onClick={() => void runAction(item.id, () => queueLeadForOperatorAction(item.id, selectedOperators[item.id], "Manager queue preparation"), "Lead byl zařazen do preferované fronty Operátora.")} className="inline-flex items-center gap-1 rounded-lg border border-sky-900/70 px-2.5 py-2 text-[11px] text-sky-300 hover:border-sky-700 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-40"><ListPlus className="h-3.5 w-3.5" /> Queue next</button>
                          </div>
                        )}
                        {canReassign && (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedOperators[item.id] || ""}
                              onChange={(event) => setSelectedOperators((current) => ({ ...current, [item.id]: event.target.value }))}
                              disabled={isBusy || bulkBusy || operators.length === 0}
                              className="min-w-[170px] rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[11px] text-zinc-300 disabled:opacity-50"
                              aria-label={`Reassign ${item.lead.full_name}`}
                            >
                              <option value="">Reassign to…</option>
                              {operators.map((operator) => <option key={operator.user_id} value={operator.user_id}>{operator.full_name}</option>)}
                            </select>
                            <button type="button" disabled={isBusy || bulkBusy || !selectedOperators[item.id]} onClick={() => reassign(item)} className="rounded-lg border border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">Reassign now</button>
                          </div>
                        )}
                        <div className="flex flex-wrap justify-end gap-2">
                          {canRelease && <button type="button" disabled={isBusy || bulkBusy} onClick={() => void runAction(item.id, () => releaseLeadAssignmentAction(item.id, "Manager queue reset / skip"), "Fronta byla resetována; lead je zpět v Available pool.")} className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40"><Unlock className="h-3.5 w-3.5" /> Reset / skip</button>}
                          {canReopen && <button type="button" disabled={isBusy || bulkBusy} onClick={() => void runAction(item.id, () => reopenLeadAssignmentAction(item.id, "Manager reopen"), "Closed lead byl znovu otevřen ve frontě.")} className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /> Reopen</button>}
                          {item.state === "in_progress" && <span className="inline-flex items-center gap-1 rounded-lg border border-rose-900/50 px-2.5 py-2 text-[11px] text-rose-300"><XCircle className="h-3.5 w-3.5" /> Active call locked — end/recover first</span>}
                          {item.state === "awaiting_outcome" && <span className="inline-flex items-center gap-1 rounded-lg border border-amber-900/50 px-2.5 py-2 text-[11px] text-amber-300"><XCircle className="h-3.5 w-3.5" /> Recovery / outcome pending</span>}
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
    </section>
  );
}
