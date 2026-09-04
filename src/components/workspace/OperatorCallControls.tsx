"use client";

import { useState } from "react";
import {
  CalendarClock,
  Mic,
  MicOff,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Radio,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import type { CallOutcome } from "@/components/workspace/CallStatusBar";
import { isTelnyxEnabled } from "@/lib/telephony/telnyxClient";
import { FAIL_REASON_OPTIONS, type FailDetails, type FailReason, validateFailDetails } from "@/lib/postCall";

const CALL_OUTCOME_OPTIONS: ReadonlyArray<{
  value: CallOutcome;
  label: string;
  icon: typeof PhoneMissed;
  shortcut: string;
}> = [
  { value: "call_later", label: "Call Later", icon: PhoneMissed, shortcut: "1" },
  { value: "schedule", label: "Schedule Callback", icon: CalendarClock, shortcut: "2" },
  { value: "fail", label: "Fail", icon: XCircle, shortcut: "3" },
  { value: "order", label: "Create Order", icon: ShoppingBag, shortcut: "4" },
];

export function getCallOutcomeLabel(outcome: CallOutcome): string {
  return CALL_OUTCOME_OPTIONS.find((option) => option.value === outcome)?.label || outcome;
}

interface OperatorCallControlsProps {
  isCallActive: boolean;
  isDialing: boolean;
  durationSeconds: number;
  isMuted: boolean;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onCallOutcome: (outcome: CallOutcome, details?: FailDetails) => void;
  onScheduleCallback: () => void;
  onSimulateIncoming?: () => void;
  isStarting?: boolean;
  isAwaitingOutcome?: boolean;
  isCompletionPending?: boolean;
  recoveryRequired?: boolean;
}

export interface CallOutcomePanelProps {
  isAwaitingOutcome: boolean;
  isCompletionPending?: boolean;
  recoveryRequired?: boolean;
  onCallOutcome: (outcome: CallOutcome, details?: FailDetails) => void;
  onScheduleCallback: () => void;
}

export function getCallOutcomeButtonClassName(isSelected: boolean): string {
  return isSelected
    ? "border-sky-300 bg-sky-950/60 text-sky-100 shadow-[0_0_0_2px_rgba(125,211,252,0.3)]"
    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100";
}

export function selectCallOutcome(
  current: CallOutcome | null,
  next: CallOutcome,
  isCompletionPending: boolean,
): CallOutcome | null {
  return isCompletionPending ? current : next;
}
export function CallOutcomePanel({
  isAwaitingOutcome,
  isCompletionPending = false,
  recoveryRequired = false,
  onCallOutcome,
  onScheduleCallback,
}: CallOutcomePanelProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null);
  const [failReason, setFailReason] = useState<FailReason | "">("");
  const [failNote, setFailNote] = useState("");
  const [failValidationError, setFailValidationError] = useState<string | null>(null);

  if (!isAwaitingOutcome) return null;

  const handleOutcomeSelect = (outcome: CallOutcome) => {
    if (isCompletionPending) return;

    setSelectedOutcome((current) => selectCallOutcome(current, outcome, isCompletionPending));
    if (outcome === "schedule") {
      onScheduleCallback();
      return;
    }
    if (outcome === "fail") {
      setFailValidationError(null);
      return;
    }
    setFailReason("");
    setFailNote("");
    setFailValidationError(null);
    onCallOutcome(outcome);
  };

  const handleFailSubmit = () => {
    const validationError = validateFailDetails({ failReason, note: failNote });
    if (validationError) {
      setFailValidationError(validationError);
      return;
    }
    onCallOutcome("fail", { failReason: failReason as FailReason, note: failNote.trim() });
  };

  return (
    <section
      className="mt-4 rounded-xl border border-amber-900/60 bg-amber-950/20 p-3"
      data-testid="call-outcome-panel"
      aria-labelledby="call-outcome-panel-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p id="call-outcome-panel-title" className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Post-call outcome required</p>
          <p className="mt-1 text-[11px] text-amber-300/80">
            {recoveryRequired ? "The call was interrupted. This lead remains assigned to you for recovery." : "Choose one explicit outcome to finish this call."}
          </p>
        </div>
        <span role="status" aria-live="polite" className="text-right text-[10px] text-amber-200">
          {isCompletionPending
            ? "Saving outcome…"
            : selectedOutcome
              ? `${CALL_OUTCOME_OPTIONS.find((option) => option.value === selectedOutcome)?.label} selected locally — not saved yet.`
              : "No outcome selected yet."}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500" id="call-outcome-panel-help">
        Selection is local until the completion action succeeds. Keyboard focus is shown separately.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Post-call outcome options">
        {CALL_OUTCOME_OPTIONS.map(({ value, label, icon: Icon, shortcut }) => {
          const isSelected = selectedOutcome === value;
          return (
            <button
              key={value}
              id={value === "fail" ? "call-outcome-fail" : undefined}
              type="button"
              disabled={isCompletionPending}
              aria-busy={isCompletionPending && isSelected}
              aria-pressed={isSelected}
              aria-describedby="call-outcome-panel-help"
              aria-keyshortcuts={shortcut}
              data-selected={isSelected ? "true" : "false"}
              onClick={() => handleOutcomeSelect(value)}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] transition-[border-color,background-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 ${getCallOutcomeButtonClassName(isSelected)} ${value === "order" ? "font-semibold" : ""}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <kbd className="rounded border border-zinc-700/80 bg-zinc-950/70 px-1 font-mono text-[10px] text-zinc-500">{shortcut}</kbd>
              <span>{label}</span>
              {isSelected && <span className="sr-only">Selected</span>}
            </button>
          );
        })}
      </div>
      {selectedOutcome === "fail" && (
        <div className="mt-3 space-y-3 rounded-lg border border-rose-900/60 bg-rose-950/20 p-3" data-testid="fail-details-panel">
          <div>
            <label htmlFor="fail-reason" className="text-[11px] font-semibold text-rose-100">Fail reason</label>
            <select
              id="fail-reason"
              value={failReason}
              onChange={(event) => {
                setFailReason(event.target.value as FailReason | "");
                setFailValidationError(null);
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-600 focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <option value="">Select a reason…</option>
              {FAIL_REASON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fail-note" className="text-[11px] font-semibold text-rose-100">Short note</label>
            <textarea
              id="fail-note"
              value={failNote}
              onChange={(event) => {
                setFailNote(event.target.value);
                setFailValidationError(null);
              }}
              rows={3}
              maxLength={2_000}
              placeholder="What prevented the conversion?"
              className="mt-1.5 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600 focus-visible:ring-2 focus-visible:ring-sky-300"
            />
          </div>
          {failValidationError && <p role="alert" className="text-[11px] text-rose-300">{failValidationError}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleFailSubmit}
              disabled={isCompletionPending}
              className="rounded-lg bg-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-950 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Fail
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function formatTimer(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function OperatorCallControls({
  isCallActive,
  isDialing,
  durationSeconds,
  isMuted,
  onToggleCall,
  onToggleMute,
  onCallOutcome,
  onScheduleCallback,
  onSimulateIncoming,
  isStarting = false,
  isAwaitingOutcome = false,
  isCompletionPending = false,
  recoveryRequired = false,
}: OperatorCallControlsProps) {
  return (
    <div className="mt-5 border-t border-zinc-800/80 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {isCallActive ? (
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span>{isTelnyxEnabled() ? "Telnyx call" : "Active call"}</span>
              <span className="font-mono text-zinc-100">{formatTimer(durationSeconds)}</span>
              {!isTelnyxEnabled() && <span className="text-emerald-400" aria-label="Simulated audio activity">▮▮▮▮</span>}
            </div>
          ) : isDialing ? (
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Radio className="h-3.5 w-3.5 animate-spin" />
              Dialing customer…
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Ready to place a call</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCall}
            disabled={isStarting}
            aria-busy={isStarting}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isCallActive
                ? "border border-rose-800 bg-rose-950/40 text-rose-200 hover:bg-rose-950/70"
                : "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
            }`}
          >
            {isCallActive ? <PhoneOff className="h-3.5 w-3.5" /> : <PhoneCall className="h-3.5 w-3.5" />}
            {isStarting ? "Starting…" : isDialing ? "Cancel dial" : isCallActive ? "End call" : "Call client"}
          </button>
          {isCallActive && (
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
              className={`rounded-lg border p-2 transition-colors ${isMuted ? "border-amber-800 bg-amber-950/30 text-amber-200" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100"}`}
            >
              {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
          {!isCallActive && !isDialing && onSimulateIncoming && (
            <button
              type="button"
              onClick={onSimulateIncoming}
              aria-label="Simulate an incoming call"
              title="Simulate an incoming call"
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-500 transition-colors hover:text-zinc-100"
            >
              <PhoneIncoming className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <CallOutcomePanel
        key={!isCallActive && !isDialing && isAwaitingOutcome ? "awaiting-outcome" : "idle"}
        isAwaitingOutcome={!isCallActive && !isDialing && isAwaitingOutcome}
        recoveryRequired={recoveryRequired}
        isCompletionPending={isCompletionPending}
        onCallOutcome={onCallOutcome}
        onScheduleCallback={onScheduleCallback}
      />
    </div>
  );
}
