"use client";

import { useMemo } from "react";
import { CalendarClock, CheckCircle2, PhoneCall, RefreshCw, RotateCcw } from "lucide-react";
import {
  getOperatorNextAction,
  type OperatorCallbackSignal,
  type OperatorNextActionState,
} from "./operatorNextAction";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type SemanticTone } from "@/components/ui/Status";
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
  const showPrimaryAction = action.kind === "recover_call" || action.kind === "claim_callback" || action.kind === "wait_for_assignment";
  const primaryLabel = action.kind === "recover_call" ? "Recover" : "Refresh queue";
  const actionIcon = action.kind === "recover_call"
    ? RotateCcw
    : action.kind === "complete_outcome"
      ? CheckCircle2
      : PhoneCall;
  const ActionIcon = actionIcon;
  const actionTone: SemanticTone = action.urgency === "critical" ? "warning" : "neutral";
  const callbackSummary = callbacks.length === 0 ? "No scheduled callbacks" : `${callbacks.length} scheduled callback${callbacks.length === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2" data-testid="operator-next-action-area">
      <Surface
        variant="inset"
        data-testid="operator-next-action"
        aria-labelledby="operator-next-action-title"
        className="flex min-w-0 items-center gap-2 px-3 py-2"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Next</span>
        <span id="operator-next-action-title" className="max-w-[12rem] truncate text-xs font-medium text-zinc-200" title={action.description}>
          {action.kind === "start_call" ? "Ready to call" : action.title}
        </span>
        <StatusBadge tone={actionTone}>{action.urgency === "critical" ? "Attention" : "Ready"}</StatusBadge>
        {showPrimaryAction && (
          <Button
            variant="secondary"
            onClick={onPrimaryAction}
            disabled={isAssignmentRefreshing}
            aria-label={primaryLabel}
            title={action.description}
          >
            {isAssignmentRefreshing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ActionIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="hidden sm:inline">{isAssignmentRefreshing ? "Refreshing…" : primaryLabel}</span>
          </Button>
        )}
      </Surface>

      <Surface
        variant="inset"
        data-testid="callback-recovery-inbox"
        aria-label="Callback inbox"
        className="flex items-center gap-2 px-3 py-2"
      >
        <CalendarClock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
        <span className="hidden max-w-[10rem] truncate text-[11px] text-zinc-400 sm:inline" title={callbackError || callbackSummary}>
          {isCallbacksLoading ? "Loading callbacks…" : callbackError ? "Callbacks unavailable" : callbackSummary}
        </span>
        <Button
          variant="quiet"
          onClick={onRefreshCallbacks}
          disabled={isAssignmentRefreshing || isCallbacksLoading}
          aria-label="Refresh callback inbox"
          title="Refresh callback inbox"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isCallbacksLoading ? "animate-spin" : ""}`} aria-hidden="true" />
        </Button>
        {callbacks[0] && <span className="hidden text-[10px] tabular-nums text-zinc-500 lg:inline">{formatCallbackTime(callbacks[0].scheduledAt)}</span>}
      </Surface>
    </div>
  );
}
