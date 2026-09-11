"use client";

import { useMemo } from "react";
import { CalendarClock, CheckCircle2, PhoneCall, RefreshCw, RotateCcw } from "lucide-react";
import {
  getOperatorNextAction,
  type OperatorCallbackSignal,
  type OperatorNextActionState,
} from "./operatorNextAction";
import { Button } from "@/components/ui/Button";
import { StatusAlert, StatusBadge, type SemanticTone } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

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

function callbackStatus(value: string): { label: string; tone: SemanticTone } {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return { label: "Time unavailable", tone: "neutral" };
  }
  if (timestamp <= Date.now()) {
    return { label: "Due now", tone: "warning" };
  }
  return { label: "Scheduled", tone: "neutral" };
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
  const actionTone: SemanticTone = action.urgency === "critical" ? "warning" : "neutral";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]" data-testid="operator-next-action-area">
      <Surface
        variant="page"
        data-testid="operator-next-action"
        aria-labelledby="operator-next-action-title"
      >
        <section className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/70 p-2 text-zinc-300">
              <ActionIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Next action</p>
              <h2 id="operator-next-action-title" className="mt-1 text-[15px] font-semibold tracking-tight text-white">{action.title}</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-300">{action.description}</p>
              <StatusBadge tone={actionTone}>{action.urgency === "critical" ? "Attention required" : "Current action"}</StatusBadge>
            </div>
          </div>
          {showPrimaryAction && (
            <Button
              variant="primary"
              onClick={onPrimaryAction}
              disabled={isAssignmentRefreshing}
            >
              {isAssignmentRefreshing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ActionIcon className="h-3.5 w-3.5" aria-hidden="true" />}
              {isAssignmentRefreshing ? "Refreshing…" : primaryLabel}
            </Button>
          )}
        </div>
        {action.kind === "complete_outcome" && (
          <StatusAlert tone="warning" className="w-full">
            The outcome controls below are the only way to finish this call safely.
          </StatusAlert>
        )}
        </section>
      </Surface>

      <Surface
        variant="inset"
        data-testid="callback-recovery-inbox"
        aria-labelledby="callback-recovery-inbox-title"
      >
        <section className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
            <div>
              <h2 id="callback-recovery-inbox-title" className="text-[13px] font-semibold text-zinc-100">Your callbacks</h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">Due first — server assigns, you just refresh.</p>
            </div>
          </div>
          <Button
            variant="quiet"
            onClick={onRefreshCallbacks}
            disabled={isAssignmentRefreshing || isCallbacksLoading}
            aria-label="Refresh callback inbox"
            title="Refresh callback inbox"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCallbacksLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>

        {isCallbacksLoading ? (
          <p className="mt-4 text-[11px] text-zinc-400">Loading your callbacks…</p>
        ) : callbackError ? (
          <StatusAlert tone="warning" className="w-full">
            Callbacks unavailable right now. Your queue still works.
          </StatusAlert>
        ) : callbacks.length === 0 ? (
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">Nothing due. When a callback matures, it appears here.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {callbacks.slice(0, 3).map((callback) => {
              const status = callbackStatus(callback.scheduledAt);
              return (
                <li key={callback.id}>
                  <Surface variant="inset">
                    <div className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-medium text-zinc-100">{callback.leadName}</p>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>
                  <p className="mt-1 text-[10px] tabular-nums text-zinc-400">{formatCallbackTime(callback.scheduledAt)}</p>
                    </div>
                  </Surface>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
          {action.kind === "claim_callback"
            ? "No callable contact is currently assigned. Refresh the queue to claim the due callback when available."
            : "Server-controlled routing — this inbox never shows the full lead directory."}
        </p>
        </section>
      </Surface>
    </div>
  );
}
