"use client";

import { useState } from "react";
import { AlertTriangle, HandHelping } from "lucide-react";
import { claimAssistanceRequestAction, resolveAssistanceRequestAction } from "@/app/actions/assistance";
import type { AssistanceRequestDTO } from "@/lib/dal/assistanceRequests";
import type { TeamMutationHandler } from "@/components/team/TeamPageContent";
import { Button } from "@/components/ui/Button";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import {
  ASSISTANCE_WAIT_THRESHOLD_MS,
  assistanceWaitingMs,
  formatAssistanceWait,
  isAssistanceOverdue,
} from "@/lib/assistanceWait";

export { ASSISTANCE_WAIT_THRESHOLD_MS };

function waitLabel(createdAt: string): string {
  return formatAssistanceWait(createdAt);
}

function waitingMs(createdAt: string): number {
  return assistanceWaitingMs(createdAt);
}

function sortByUrgency(requests: AssistanceRequestDTO[]): AssistanceRequestDTO[] {
  return [...requests].sort((left, right) => {
    const leftOpen = left.status === "open" ? 0 : 1;
    const rightOpen = right.status === "open" ? 0 : 1;
    if (leftOpen !== rightOpen) return leftOpen - rightOpen;
    return waitingMs(right.createdAt) - waitingMs(left.createdAt);
  });
}

export function TeamAssistancePanel({
  requests,
  onMutationAction,
}: {
  requests: AssistanceRequestDTO[];
  onMutationAction: TeamMutationHandler;
}) {
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function run(requestId: string, action: () => Promise<unknown>) {
    setBusyRequestId(requestId);
    setErrorMessage(null);
    try {
      await onMutationAction(action);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Žádost o asistenci se nepodařilo aktualizovat.");
    } finally {
      setBusyRequestId(null);
    }
  }

  const sortedRequests = sortByUrgency(requests);
  const overdueCount = requests.filter((request) => request.status === "open" && isAssistanceOverdue(request.createdAt)).length;

  return (
    <Surface variant="page">
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <HandHelping className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Co vyžaduje pozornost</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Jednoduché signály od operátorů. Převzetí znamená, že za operátorem jdete osobně.
                {overdueCount > 0 && (
                  <span className="mt-1 block text-zinc-400">
                    {overdueCount === 1 ? "1 položka čeká déle než 5 min" : `${overdueCount} položky čekají déle než 5 min`}
                  </span>
                )}
              </p>
            </div>
          </div>
          <StatusBadge tone={overdueCount > 0 ? "warning" : requests.length > 0 ? "warning" : "neutral"}>{requests.length} otevřených</StatusBadge>
        </div>

        {errorMessage && <StatusAlert tone="danger" role="alert">{errorMessage}</StatusAlert>}

        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
            Žádný operátor právě nečeká na asistenci.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRequests.map((request) => {
              const busy = busyRequestId === request.id;
              const isSos = request.requestType === "sos";
              const overdue = request.status === "open" && isAssistanceOverdue(request.createdAt);
              return (
                <article key={request.id} className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      {isSos && <AlertTriangle className="mt-0.5 h-4 w-4 text-zinc-300" aria-label="Urgentní SOS" />}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-100">{request.operatorName}</h3>
                          <StatusBadge tone={isSos ? "danger" : "warning"}>{isSos ? "SOS" : "Request Help"}</StatusBadge>
                          <StatusBadge tone={request.status === "claimed" ? "neutral" : overdue ? "warning" : "warning"}>
                            {request.status === "claimed" ? "Převzato" : "Čeká na pomoc"}
                          </StatusBadge>
                          <StatusBadge tone={overdue ? "warning" : "neutral"}>
                            <span suppressHydrationWarning>
                              čeká {waitLabel(request.createdAt)}{overdue ? " · déle než 5 min" : ""}
                            </span>
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Tým: {request.teamName}
                        </p>
                        {request.note && <p className="mt-3 text-xs leading-relaxed text-zinc-300">„{request.note}“</p>}
                        {request.claimedByName && <p className="mt-2 text-[11px] text-zinc-500">Přebírá: {request.claimedByName}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      {request.status === "open" && (
                        <Button type="button" variant="secondary" disabled={busy} onClick={() => void run(request.id, () => claimAssistanceRequestAction(request.id))}>
                          Přebírám
                        </Button>
                      )}
                      {request.status === "claimed" && (
                        <Button type="button" variant="primary" disabled={busy} onClick={() => void run(request.id, () => resolveAssistanceRequestAction(request.id))}>
                          Vyřešeno
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Surface>
  );
}
