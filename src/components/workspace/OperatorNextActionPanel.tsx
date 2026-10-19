"use client";

import { useMemo } from "react";
import { CalendarClock, CheckCircle2, PhoneCall, RefreshCw, RotateCcw } from "lucide-react";
import {
  getOperatorNextAction,
  type OperatorScheduledCallSignal,
  type OperatorNextActionState,
} from "./operatorNextAction";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type SemanticTone } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface OperatorNextActionPanelProps {
  state: OperatorNextActionState;
  leadName: string | null;
  scheduledCalls: OperatorScheduledCallSignal[];
  isScheduledCallsLoading: boolean;
  scheduledCallError: string | null;
  isAssignmentRefreshing: boolean;
  onPrimaryAction: () => void;
  onRefreshScheduledCalls: () => void;
}

function formatScheduledCallTime(value: string): string {
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
  scheduledCalls,
  isScheduledCallsLoading,
  scheduledCallError,
  isAssignmentRefreshing,
  onPrimaryAction,
  onRefreshScheduledCalls,
}: OperatorNextActionPanelProps) {
  const action = useMemo(
    () => getOperatorNextAction({ state, leadName, scheduledCalls }),
    [scheduledCalls, leadName, state],
  );
  const showPrimaryAction = action.kind === "recover_call" || action.kind === "claim_scheduled_call" || action.kind === "wait_for_assignment";
  const primaryLabel = action.kind === "recover_call" ? "Recover" : "Refresh queue";
  const actionIcon = action.kind === "recover_call"
    ? RotateCcw
    : action.kind === "complete_outcome"
      ? CheckCircle2
      : PhoneCall;
  const ActionIcon = actionIcon;
  const actionTone: SemanticTone = action.urgency === "critical" ? "warning" : "neutral";
  const scheduledCallSummary = scheduledCalls.length === 0 ? "No scheduled calls" : `${scheduledCalls.length} scheduled call${scheduledCalls.length === 1 ? "" : "s"}`;

  return (
    <div
      className="flex w-full min-w-0 flex-col items-stretch justify-start gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end"
      data-testid="operator-next-action-area"
    >
      <Surface
        variant="inset"
        data-testid="operator-next-action"
        aria-labelledby="operator-next-action-title"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-2">
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
        </div>
      </Surface>

      <Surface
        variant="inset"
        data-testid="scheduled-call-recovery-inbox"
        aria-label="Schedules"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <CalendarClock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          <span className="hidden max-w-[10rem] truncate text-[11px] text-zinc-400 sm:inline" title={scheduledCallError || scheduledCallSummary}>
            {isScheduledCallsLoading ? "Loading schedules…" : scheduledCallError ? "Schedules unavailable" : scheduledCallSummary}
          </span>
          <Button
            variant="quiet"
            onClick={onRefreshScheduledCalls}
            disabled={isAssignmentRefreshing || isScheduledCallsLoading}
            aria-label="Refresh schedules"
            title="Refresh schedules"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScheduledCallsLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
          {scheduledCalls[0] && <span className="hidden text-[10px] tabular-nums text-zinc-500 lg:inline">{formatScheduledCallTime(scheduledCalls[0].scheduledAt)}</span>}
        </div>
      </Surface>
    </div>
  );
}
