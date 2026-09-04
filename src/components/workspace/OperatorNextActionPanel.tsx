"use client";

import { useMemo } from "react";
import { CalendarClock, CheckCircle2, PhoneCall, RefreshCw, RotateCcw } from "lucide-react";
import {
  getOperatorNextAction,
  type OperatorCallbackSignal,
  type OperatorNextActionState,
} from "./operatorNextAction";

interface OperatorNextActionPanelProps {
  state: OperatorNextActionState;
  leadName: string | null;
  callbacks: OperatorCallbackSignal[];
  isCallbacksLoading: boolean;
  callbackError: string | null;
  isAssignmentRefreshing: boolean;
  onPrimaryAction: () => void;
  onRefreshCallbacks: () => void;
}

function formatCallbackTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function callbackStatus(value: string): { label: string; className: string } {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return { label: "Time unavailable", className: "text-zinc-500" };
  }
  if (timestamp <= Date.now()) {
    return { label: "Due now", className: "text-amber-200" };
  }
  return { label: "Scheduled", className: "text-zinc-400" };
}

export function OperatorNextActionPanel({
  state,
  leadName,
  callbacks,
  isCallbacksLoading,
  callbackError,
  isAssignmentRefreshing,
  onPrimaryAction,
  onRefreshCallbacks,
}: OperatorNextActionPanelProps) {
  const action = useMemo(
    () => getOperatorNextAction({ state, leadName, callbacks }),
    [callbacks, leadName, state],
  );
  const showPrimaryAction = action.kind !== "wait_for_connection" && action.kind !== "complete_outcome";
  const primaryLabel = {
    recover_call: "Recover call",
    start_call: "Start call",
    end_call: "End call",
    claim_callback: "Refresh queue",
    continue: "Continue",
    wait_for_assignment: "Refresh queue",
    wait_for_connection: "Waiting…",
    complete_outcome: "Choose outcome below",
  }[action.kind];
  const actionIcon = action.kind === "recover_call"
    ? RotateCcw
    : action.kind === "claim_callback" || action.kind === "wait_for_assignment"
      ? RefreshCw
      : action.kind === "complete_outcome"
        ? CheckCircle2
        : PhoneCall;
  const ActionIcon = actionIcon;
  const actionTone = action.urgency === "critical"
    ? "border-amber-800/80 bg-amber-950/20"
    : action.urgency === "attention"
      ? "border-sky-800/70 bg-sky-950/15"
      : "border-zinc-800/80 bg-zinc-950/30";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]" data-testid="operator-next-action-area">
      <section
        className={`rounded-xl border p-4 shadow-sm ${actionTone}`}
        data-testid="operator-next-action"
        aria-labelledby="operator-next-action-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/70 p-2 text-zinc-300">
              <ActionIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Next action</p>
              <h2 id="operator-next-action-title" className="mt-1 text-sm font-semibold text-zinc-100">{action.title}</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">{action.description}</p>
            </div>
          </div>
          {showPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={isAssignmentRefreshing}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAssignmentRefreshing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ActionIcon className="h-3.5 w-3.5" aria-hidden="true" />}
              {isAssignmentRefreshing ? "Refreshing…" : primaryLabel}
            </button>
          )}
        </div>
        {action.kind === "complete_outcome" && (
          <p className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">
            The outcome controls below are the only way to finish this call safely.
          </p>
        )}
      </section>

      <section
        className="rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-4 shadow-sm"
        data-testid="callback-recovery-inbox"
        aria-labelledby="callback-recovery-inbox-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
            <div>
              <h2 id="callback-recovery-inbox-title" className="text-xs font-semibold text-zinc-200">Callback recovery inbox</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">Due and upcoming callbacks assigned to you.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefreshCallbacks}
            disabled={isAssignmentRefreshing || isCallbacksLoading}
            aria-label="Refresh callback inbox"
            title="Refresh callback inbox"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCallbacksLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>

        {isCallbacksLoading ? (
          <p className="mt-4 text-[11px] text-zinc-500">Loading callback inbox…</p>
        ) : callbackError ? (
          <p className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
            Callback inbox unavailable. The operator queue remains available.
          </p>
        ) : callbacks.length === 0 ? (
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">No due or upcoming callbacks are assigned to you.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {callbacks.slice(0, 3).map((callback) => {
              const status = callbackStatus(callback.scheduledAt);
              return (
                <li key={callback.id} className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-[11px] font-medium text-zinc-200">{callback.leadName}</p>
                    <span className={`shrink-0 text-[10px] font-medium ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500">{formatCallbackTime(callback.scheduledAt)}</p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
          {action.kind === "claim_callback"
            ? "No callable contact is currently assigned. Refresh the queue to claim the due callback when available."
            : "Callback routing remains server-controlled; the inbox never exposes the full lead directory."}
        </p>
      </section>
    </div>
  );
}
