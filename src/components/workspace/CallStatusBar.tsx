"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown, Mic, MicOff, Pause, PhoneCall, PhoneIncoming, PhoneOff, Play, Radio, Settings } from "lucide-react";
import { OperatorStatus } from "@/components/layout/Sidebar";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import type { FailDetails } from "@/lib/postCall";
import type { TelephonyAdapter } from "@/lib/telephony/telephonyAdapter";

export type CallOutcome = "call_later" | "schedule" | "fail" | "order";

interface CallStatusBarProps {
  status: OperatorStatus;
  isCallActive: boolean;
  isDialing: boolean;
  durationSeconds: number;
  isMuted: boolean;
  isOnHold: boolean;
  activeLeadName?: string;
  activeLeadPhone?: string;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onSimulateIncoming: () => void;
  onStatusChange: (newStatus: OperatorStatus) => void;
  onCallOutcome: (outcome: CallOutcome, details?: FailDetails) => void;
  onScheduleCallback?: () => void;
  showIncomingSimulator?: boolean;
  isStarting?: boolean;
  isAwaitingOutcome?: boolean;
  telephonyAdapter?: TelephonyAdapter;
}

export function CallStatusBar({ status, isCallActive, isDialing, durationSeconds, isMuted, isOnHold, activeLeadName, activeLeadPhone, onToggleCall, onToggleMute, onToggleHold, onSimulateIncoming, onStatusChange, showIncomingSimulator = true, isStarting = false, isAwaitingOutcome = false, telephonyAdapter = "simulation" }: CallStatusBarProps) {
  const formatTimer = (totalSeconds: number) => `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
  const statusLabel = status === "ready" ? "Ready for Calls" : status === "in_call" ? "In Call" : "On Break";
  const telephonyLabel = telephonyAdapter === "local_sip" ? "Local SIP call" : telephonyAdapter === "telnyx" ? "Telnyx call" : "Simulated call";

  return (
    <Surface variant="page" className="w-full">
    <section className="flex flex-col justify-between gap-5 p-5 lg:flex-row lg:items-center">
      <div className="flex items-center gap-5 min-w-0">
        <div className="relative shrink-0">
          <div className="flex items-center gap-2">
            <StatusBadge tone="neutral">{statusLabel}</StatusBadge>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            <select aria-label="Operator status" value={status} onChange={(event) => onStatusChange(event.target.value as OperatorStatus)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
              <option value="ready">Ready for Calls</option>
              <option value="in_call">In Call</option>
              <option value="break">On Break</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-sm shrink-0">{activeLeadName?.charAt(0) || "L"}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-zinc-100 truncate">{activeLeadName || "Select a Lead"}</span>
              {activeLeadPhone && <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">({activeLeadPhone})</span>}
            </div>
            {isDialing && <div className="flex items-center gap-2 text-zinc-300 text-xs font-medium mt-0.5"><Radio className="w-3.5 h-3.5 animate-spin" />Dialing customer...</div>}
            {isCallActive && !isDialing && <div className="flex items-center gap-3 text-zinc-300 text-xs font-medium mt-0.5"><span className="inline-flex h-2 w-2 rounded-full bg-zinc-500" aria-hidden="true" /><span>{telephonyLabel} ·</span><span className="font-mono text-zinc-100">{formatTimer(durationSeconds)}</span>{telephonyAdapter === "simulation" && <span className="text-zinc-300" aria-label="Simulated audio activity">▮▮▮▮</span>}</div>}
            {!isCallActive && !isDialing && <span className="text-[11px] text-zinc-400 block">Ready to place a call</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-end">
        <Button variant={isCallActive ? "danger" : "primary"} onClick={onToggleCall} disabled={isStarting} aria-busy={isStarting} aria-label={isCallActive ? `End call with ${activeLeadName || "current lead"}` : isDialing ? "Cancel dialing" : "Call client"} title={isCallActive ? "End call" : isDialing ? "Cancel dialing" : "Call client"}>
          {isCallActive ? <PhoneOff className="w-4 h-4" /> : <PhoneCall className="w-4 h-4 fill-current" />}
          <span className={isCallActive ? "sr-only" : ""}>{isStarting ? "Starting Call..." : isDialing ? "Cancel Dial" : isCallActive ? "End Call" : "Call Client"}</span>
        </Button>
        {isCallActive && <>
          <Button variant="secondary" onClick={onToggleMute} aria-label={isMuted ? "Unmute microphone" : "Mute microphone"} title={isMuted ? "Unmute microphone" : "Mute microphone"}>{isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</Button>
          <Button variant="secondary" onClick={onToggleHold} aria-label={isOnHold ? "Resume call" : "Put call on hold"} title={isOnHold ? "Resume call" : "Put call on hold"}>{isOnHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</Button>
          <Link href="/settings" aria-label="Open settings" title="Open settings" className={getButtonClassName("secondary")}><Settings className="w-4 h-4" /></Link>
        </>}
        {isAwaitingOutcome && <StatusAlert tone="warning" className="w-full">Post-call outcome required.</StatusAlert>}
        {!isCallActive && !isDialing && showIncomingSimulator && <Button variant="secondary" onClick={onSimulateIncoming} title="Simulate an incoming call" aria-label="Simulate an incoming call"><PhoneIncoming className="w-4 h-4" /></Button>}
      </div>
    </section>
    </Surface>
  );
}
