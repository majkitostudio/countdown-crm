"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, Mail, Mic, MicOff, Phone, PhoneCall, PhoneIncoming, PhoneOff, Settings } from "lucide-react";
import type { Lead } from "@/lib/leads";
import { CallOutcomePanel } from "@/components/workspace/OperatorCallControls";
import type { CallOutcome } from "@/components/workspace/CallStatusBar";
import type { FailDetails } from "@/lib/postCall";
import type { TelephonyAdapter } from "@/lib/telephony/telephonyAdapterShared";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface OperatorLeadHeaderProps {
  activeLead: Lead | null;
  isCallActive: boolean;
  isDialing: boolean;
  isMuted: boolean;
  durationSeconds: number;
  callFailureMessage?: string | null;
  isStarting?: boolean;
  telephonyAdapter?: TelephonyAdapter;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onCreateOrder?: () => void;
  onSimulateIncoming?: () => void;
  showIncomingSimulator?: boolean;
  isAwaitingOutcome?: boolean;
  recoveryRequired?: boolean;
  isCompletionPending?: boolean;
  onCallOutcome?: (outcome: CallOutcome, details?: FailDetails) => void;
  onScheduleCallback?: () => void;
}

export function OperatorLeadHeader({
  activeLead,
  isCallActive,
  isDialing,
  isMuted,
  durationSeconds,
  callFailureMessage = null,
  isStarting = false,
  telephonyAdapter = "simulation",
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
      <Surface variant="page" data-testid="operator-lead-primary" data-state="waiting_assignment">
        <section className="p-5 text-sm text-zinc-400">No active customer selected.</section>
      </Surface>
    );
  }

  const leadState = isAwaitingOutcome
    ? "awaiting_outcome"
    : isDialing
      ? "dialing"
      : isCallActive
        ? "in_call"
        : callFailureMessage
          ? "call_failed"
          : "ready";
  return (
    <Surface
      variant="page"
      data-testid="operator-lead-primary"
      data-state={leadState}
      aria-labelledby="operator-lead-title"
    >
    <section className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Assigned customer</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id="operator-lead-title" className="text-2xl font-semibold tracking-tight text-white">{activeLead.full_name}</h2>
            <Link
              href={`/leads/${encodeURIComponent(activeLead.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open read-only profile"
              title="Open read-only profile"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <StatusBadge tone="neutral">
              {activeLead.status || "New lead"}
            </StatusBadge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-medium text-zinc-200">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Phone className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              {activeLead.phone}
            </span>
            {activeLead.email && (
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
                <span className="truncate">{activeLead.email}</span>
              </span>
            )}
          </div>
          <p className="mt-3 font-mono text-[10px] text-zinc-600">Lead ID: {activeLead.id}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isCallActive || isDialing ? (
            <>
              <div className="mr-1 text-right">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{isDialing ? "Dialing…" : telephonyAdapter === "local_sip" ? "Local SIP call" : telephonyAdapter === "telnyx" ? "Telnyx call" : "Simulated call"}</p>
                <p className="font-mono text-sm font-semibold tabular-nums text-zinc-100">{formatTimer(durationSeconds)}</p>
              </div>
              <Button
                variant="secondary"
                onClick={onToggleMute}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                aria-keyshortcuts="M"
                title={`${isMuted ? "Unmute microphone" : "Mute microphone"} (M)`}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Link
                href="/settings"
                aria-label="Open settings"
                title="Open settings"
                className={getButtonClassName("secondary")}
              >
                <Settings className="h-4 w-4" />
              </Link>
              <Button
                variant="danger"
                onClick={onToggleCall}
                aria-label="End call"
                aria-keyshortcuts="C"
                title="End call (C)"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </>
          ) : callFailureMessage ? (
            <StatusAlert tone="danger" className="w-full">
              <div className="max-w-xs text-right">
              <p className="text-[10px] uppercase tracking-wider text-rose-200">Call failed</p>
              <p className="mt-0.5 text-[10px] text-rose-300/80">{callFailureMessage}</p>
              </div>
            </StatusAlert>
          ) : isAwaitingOutcome ? (
            <StatusAlert tone="warning" className="w-full">
              <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Outcome required</p>
              <p className="mt-0.5 text-[11px] text-amber-200/90">Lead stays with you until saved</p>
              </div>
            </StatusAlert>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={onToggleCall}
                disabled={isStarting}
                aria-busy={isStarting}
                aria-keyshortcuts="C"
                title="Call client (C)"
              >
                <PhoneCall className="h-4 w-4" />
                {isStarting ? "Starting call..." : "Call Client"}
                {!isStarting && <kbd className="rounded border border-zinc-300/60 bg-zinc-200/70 px-1 font-mono text-[10px] text-zinc-600">C</kbd>}
              </Button>
              {onCreateOrder && (
                <Button
                  variant="secondary"
                  onClick={onCreateOrder}
                >
                  Create Order
                </Button>
              )}
              {showIncomingSimulator && onSimulateIncoming && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={onSimulateIncoming}
                  title="Simulate an incoming call"
                  aria-label="Simulate an incoming call"
                >
                  <PhoneIncoming className="h-4 w-4" />
                </Button>
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
    </Surface>
  );
}
