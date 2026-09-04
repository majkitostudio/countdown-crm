"use client";

import React from "react";
import Link from "next/link";
import { Mail, Mic, MicOff, Phone, PhoneCall, PhoneIncoming, PhoneOff, Settings, Tag } from "lucide-react";
import type { Lead } from "@/lib/leads";
import { CallOutcomePanel } from "@/components/workspace/OperatorCallControls";
import type { CallOutcome } from "@/components/workspace/CallStatusBar";

interface OperatorLeadHeaderProps {
  activeLead: Lead | null;
  isCallActive: boolean;
  isDialing: boolean;
  isMuted: boolean;
  durationSeconds: number;
  isStarting?: boolean;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onCreateOrder?: () => void;
  onSimulateIncoming?: () => void;
  showIncomingSimulator?: boolean;
  isAwaitingOutcome?: boolean;
  recoveryRequired?: boolean;
  isCompletionPending?: boolean;
  onCallOutcome?: (outcome: CallOutcome) => void;
  onScheduleCallback?: () => void;
}

export function OperatorLeadHeader({
  activeLead,
  isCallActive,
  isDialing,
  isMuted,
  durationSeconds,
  isStarting = false,
  onToggleCall,
  onToggleMute,
  onCreateOrder,
  onSimulateIncoming,
  showIncomingSimulator = false,
  isAwaitingOutcome = false,
  recoveryRequired = false,
  isCompletionPending = false,
  onCallOutcome,
  onScheduleCallback,
}: OperatorLeadHeaderProps) {
  const formatTimer = (totalSeconds: number) =>
    `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;

  if (!activeLead) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 text-sm text-zinc-400" data-testid="operator-lead-primary" data-state="waiting_assignment">
        No active customer selected.
      </section>
    );
  }

  const leadState = isAwaitingOutcome
    ? "awaiting_outcome"
    : isDialing
      ? "dialing"
      : isCallActive
        ? "in_call"
        : "ready";
  const leadStateClassName = isAwaitingOutcome
    ? "border-amber-800/70 bg-amber-950/10 ring-1 ring-amber-300/10"
    : isDialing
      ? "border-sky-800/70 bg-sky-950/10 ring-1 ring-sky-300/10"
      : isCallActive
        ? "border-rose-800/70 bg-zinc-900/70 ring-1 ring-rose-300/10"
        : "border-zinc-700/80 bg-zinc-900/70 ring-1 ring-white/5";

  return (
    <section
      className={`rounded-xl p-5 shadow-lg ${leadStateClassName}`}
      data-testid="operator-lead-primary"
      data-state={leadState}
      aria-labelledby="operator-lead-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Current Lead</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id="operator-lead-title" className="text-xl font-semibold tracking-tight text-zinc-100">{activeLead.full_name}</h2>
            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {activeLead.status || "New lead"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Phone className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              {activeLead.phone}
            </span>
            {activeLead.email && (
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
                <span className="truncate">{activeLead.email}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Tag className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              Source unavailable
            </span>
          </div>
          <p className="mt-3 font-mono text-[11px] text-zinc-500">Lead ID: {activeLead.id}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isCallActive || isDialing ? (
            <>
              <div className="mr-1 text-right">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{isDialing ? "Dialing" : "Active call"}</p>
                <p className="font-mono text-xs text-zinc-200">{formatTimer(durationSeconds)}</p>
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                aria-keyshortcuts="M"
                title={`${isMuted ? "Unmute microphone" : "Mute microphone"} (M)`}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <Link
                href="/settings"
                aria-label="Open settings"
                title="Open settings"
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={onToggleCall}
                aria-label="End call"
                aria-keyshortcuts="C"
                title="End call (C)"
                className="rounded-xl border border-rose-800 bg-rose-900/80 p-2.5 text-rose-100 hover:bg-rose-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </>
          ) : isAwaitingOutcome ? (
            <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-amber-200">Outcome required</p>
              <p className="mt-0.5 text-[10px] text-amber-300/80">Lead remains assigned</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onToggleCall}
                disabled={isStarting}
                aria-busy={isStarting}
                aria-keyshortcuts="C"
                title="Call client (C)"
                className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PhoneCall className="h-4 w-4" />
                {isStarting ? "Starting call..." : "Call Client"}
                {!isStarting && <kbd className="rounded border border-zinc-300/60 bg-zinc-200/70 px-1 font-mono text-[10px] text-zinc-600">C</kbd>}
              </button>
              {onCreateOrder && (
                <button
                  type="button"
                  onClick={onCreateOrder}
                  className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Create Order
                </button>
              )}
              {showIncomingSimulator && onSimulateIncoming && (
                <button
                  type="button"
                  onClick={onSimulateIncoming}
                  title="Simulate an incoming call"
                  aria-label="Simulate an incoming call"
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  <PhoneIncoming className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {!isCallActive && !isDialing && onCallOutcome && onScheduleCallback && (
        <CallOutcomePanel
          key={isAwaitingOutcome ? "awaiting-outcome" : "idle"}
          isAwaitingOutcome={isAwaitingOutcome}
          recoveryRequired={recoveryRequired}
          isCompletionPending={isCompletionPending}
          onCallOutcome={onCallOutcome}
          onScheduleCallback={onScheduleCallback}
        />
      )}
    </section>
  );
}
