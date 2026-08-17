"use client";

import React from "react";
import { Calendar, ChevronDown, Mic, MicOff, Pause, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOff, Play, Radio, ShoppingBag, XCircle } from "lucide-react";
import { OperatorStatus } from "@/components/layout/Sidebar";

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
  onCallOutcome: (outcome: CallOutcome) => void;
}

export function CallStatusBar({ status, isCallActive, isDialing, durationSeconds, isMuted, isOnHold, activeLeadName, activeLeadPhone, onToggleCall, onToggleMute, onToggleHold, onSimulateIncoming, onStatusChange, onCallOutcome }: CallStatusBarProps) {
  const formatTimer = (totalSeconds: number) => `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
  const statusLabel = status === "ready" ? "Ready for Calls" : status === "in_call" ? "In Call" : "On Break";
  const statusColor = status === "ready" ? "bg-emerald-500" : status === "in_call" ? "bg-rose-500" : "bg-amber-500";

  return (
    <section className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm">
      <div className="flex items-center gap-5 min-w-0">
        <div className="relative shrink-0">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-200">
            <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
            <span>{statusLabel}</span>
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
            {isCallActive && !isDialing && <div className="flex items-center gap-3 text-zinc-300 text-xs font-medium mt-0.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" /></span><span>Call simulation ·</span><span className="font-mono text-zinc-100">{formatTimer(durationSeconds)}</span><span className="text-emerald-400" aria-label="Simulated audio activity">▮▮▮▮</span></div>}
            {!isCallActive && !isDialing && <span className="text-[11px] text-zinc-400 block">Ready to place a call</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-end">
        <button type="button" onClick={onToggleCall} disabled={isDialing} aria-busy={isDialing} className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${isCallActive ? "bg-rose-900/80 border border-rose-800 text-rose-100 hover:bg-rose-900" : "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"}`}>
          {isCallActive ? <PhoneOff className="w-4 h-4" /> : <PhoneCall className="w-4 h-4 fill-current" />}
          <span>{isCallActive ? "End Call" : "Call Client"}</span>
        </button>
        {isCallActive && <>
          <button type="button" onClick={onToggleMute} aria-label={isMuted ? "Unmute microphone" : "Mute microphone"} title={isMuted ? "Unmute microphone" : "Mute microphone"} className="p-2.5 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200">{isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>
          <button type="button" onClick={onToggleHold} aria-label={isOnHold ? "Resume call" : "Put call on hold"} title={isOnHold ? "Resume call" : "Put call on hold"} className="p-2.5 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200">{isOnHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</button>
          <button onClick={() => onCallOutcome("call_later")} title="Customer did not answer" className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5"><PhoneMissed className="w-3.5 h-3.5" />No Answer</button>
          <button onClick={() => onCallOutcome("schedule")} title="Schedule a follow-up call" className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Schedule Callback</button>
          <button onClick={() => onCallOutcome("fail")} title="Customer is not interested" className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Not Interested</button>
          <button onClick={() => onCallOutcome("order")} title="Open the order flow" className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-100 flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" />Order</button>
        </>}
        {!isCallActive && !isDialing && <button onClick={onSimulateIncoming} title="Simulate an incoming call" aria-label="Simulate an incoming call" className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"><PhoneIncoming className="w-4 h-4" /></button>}
      </div>
    </section>
  );
}
