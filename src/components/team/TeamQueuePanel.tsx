"use client";

import Link from "next/link";
import { useState } from "react";
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
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface TeamQueuePanelProps {
  queueItems: QueueItemDTO[];
  operators: WorkspaceMemberDTO[];
  operatorsState: "ready" | "unavailable";
  onMutation: TeamMutationHandler;
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

export function TeamQueuePanel({ queueItems, operators, operatorsState, onMutation }: TeamQueuePanelProps) {
  const [selectedOperators, setSelectedOperators] = useState<Record<string, string>>({});
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
      setErrorMessage(error instanceof Error ? error.message : "Queue action could not be completed.");
    } finally {
      setBusyItemId(null);
    }
  };

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
            <h2 className="text-sm font-semibold text-zinc-100">Lead Queue Operations</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Serverem řízená fronta. Operátor vidí pouze svůj aktuální kontakt; zde může Team Leader nebo Administrator provést auditovaný zásah.
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] font-mono text-zinc-400">
          {queueItems.length} queue item{queueItems.length === 1 ? "" : "s"}
        </span>
      </div>

      {successMessage && <StatusAlert tone="success" role="status">{successMessage}</StatusAlert>}
      {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}
      {operatorsState === "unavailable" && <StatusAlert tone="neutral" role="status">Workspace operators are unavailable.</StatusAlert>}

      {queueItems.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-xs text-zinc-500">
          Queue is empty. No assignment data was fabricated.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Assigned Operator</th>
                <th className="px-4 py-3">Available / callback</th>
                <th className="px-4 py-3 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {queueItems.map((item) => {
                const isBusy = busyItemId === item.id;
                const canRelease = item.state === "assigned" || item.state === "awaiting_outcome" || item.state === "paused";
                const canReassign = item.state === "available" || item.state === "assigned" || item.state === "waiting_callback";
                const canReopen = item.state === "closed";
                return (
                  <tr key={item.id} className="align-top hover:bg-zinc-900/70">
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
                        {canReassign && (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedOperators[item.id] || ""}
                              onChange={(event) => setSelectedOperators((current) => ({ ...current, [item.id]: event.target.value }))}
                              disabled={isBusy || operatorsState === "unavailable" || operators.length === 0}
                              className="min-w-[170px] rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[11px] text-zinc-300 disabled:opacity-50"
                              aria-label={`Reassign ${item.lead.full_name}`}
                            >
                              <option value="">Reassign to…</option>
                              {operators.map((operator) => <option key={operator.user_id} value={operator.user_id}>{operator.full_name}</option>)}
                            </select>
                            <Button variant="secondary" disabled={isBusy || !selectedOperators[item.id]} onClick={() => reassign(item)}>Assign</Button>
                          </div>
                        )}
                        <div className="flex flex-wrap justify-end gap-2">
                          {canRelease && <Button variant="secondary" disabled={isBusy} onClick={() => void runAction(item.id, () => releaseLeadAssignmentAction(item.id, "Team Leader release"), "Assignment byl uvolněn do available pool.")}><Unlock className="h-3.5 w-3.5" /> Release</Button>}
                          {canReopen && <Button variant="secondary" disabled={isBusy} onClick={() => void runAction(item.id, () => reopenLeadAssignmentAction(item.id, "Team Leader reopen"), "Closed lead byl znovu otevřen ve frontě.")}><RotateCcw className="h-3.5 w-3.5" /> Reopen</Button>}
                          {item.state === "in_progress" && <span className="inline-flex items-center gap-1 rounded-lg border border-rose-900/50 px-2.5 py-2 text-[11px] text-rose-300"><XCircle className="h-3.5 w-3.5" /> Active call locked</span>}
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
      </div>
    </Surface>
  );
}
