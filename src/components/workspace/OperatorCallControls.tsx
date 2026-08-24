"use client";

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

interface OperatorCallControlsProps {
  isCallActive: boolean;
  isDialing: boolean;
  durationSeconds: number;
  isMuted: boolean;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onCallOutcome: (outcome: CallOutcome) => void;
  onScheduleCallback: () => void;
  onSimulateIncoming?: () => void;
  isStarting?: boolean;
  isAwaitingOutcome?: boolean;
  isCompletionPending?: boolean;
}

interface CallOutcomePanelProps {
  isAwaitingOutcome: boolean;
  isCompletionPending?: boolean;
  recoveryRequired?: boolean;
  onCallOutcome: (outcome: CallOutcome) => void;
  onScheduleCallback: () => void;
}

export function CallOutcomePanel({
  isAwaitingOutcome,
  isCompletionPending = false,
  recoveryRequired = false,
  onCallOutcome,
  onScheduleCallback,
}: CallOutcomePanelProps) {
  if (!isAwaitingOutcome) return null;

  return (
    <div className="mt-4 rounded-xl border border-amber-900/60 bg-amber-950/20 p-3" data-testid="call-outcome-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Post-call outcome required</p>
          <p className="mt-1 text-[11px] text-amber-300/80">
            {recoveryRequired ? "The call was interrupted. This lead remains assigned to you for recovery." : "Choose one explicit outcome to finish this call."}
          </p>
        </div>
        {isCompletionPending && <span className="text-[10px] text-amber-200">Saving…</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" disabled={isCompletionPending} onClick={() => onCallOutcome("call_later")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[11px] text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">
          <PhoneMissed className="h-3.5 w-3.5" />
          Call Later
        </button>
        <button type="button" disabled={isCompletionPending} onClick={onScheduleCallback} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[11px] text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">
          <CalendarClock className="h-3.5 w-3.5" />
          Schedule Callback
        </button>
        <button type="button" disabled={isCompletionPending} onClick={() => onCallOutcome("fail")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[11px] text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">
          <XCircle className="h-3.5 w-3.5" />
          Not interested
        </button>
        <button type="button" disabled={isCompletionPending} onClick={() => onCallOutcome("order")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-[11px] font-semibold text-zinc-100 transition-colors hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50">
          <ShoppingBag className="h-3.5 w-3.5" />
          Create Order
        </button>
      </div>
    </div>
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
              <span>Active call</span>
              <span className="font-mono text-zinc-100">{formatTimer(durationSeconds)}</span>
              <span className="text-emerald-400" aria-label="Simulated audio activity">▮▮▮▮</span>
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
        isAwaitingOutcome={isAwaitingOutcome}
        isCompletionPending={isCompletionPending}
        onCallOutcome={onCallOutcome}
        onScheduleCallback={onScheduleCallback}
      />
    </div>
  );
}
