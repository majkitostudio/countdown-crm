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
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        No active customer selected.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Current Lead</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{activeLead.full_name}</h1>
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
                title={isMuted ? "Unmute microphone" : "Mute microphone"}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 hover:text-zinc-200"
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <Link
                href="/settings"
                aria-label="Open settings"
                title="Open settings"
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 hover:text-zinc-200"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={onToggleCall}
                aria-label="End call"
                title="End call"
                className="rounded-xl border border-rose-800 bg-rose-900/80 p-2.5 text-rose-100 hover:bg-rose-900"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onToggleCall}
                disabled={isStarting}
                aria-busy={isStarting}
                className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PhoneCall className="h-4 w-4" />
                {isStarting ? "Starting call..." : "Call Client"}
              </button>
              {onCreateOrder && (
                <button
                  type="button"
                  onClick={onCreateOrder}
                  className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
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
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 hover:text-zinc-200"
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
