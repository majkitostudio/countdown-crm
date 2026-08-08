"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Clock,
  ChevronDown,
  PhoneIncoming,
  Radio,
  Calendar,
  PhoneMissed,
  XCircle,
  ShoppingBag,
  UserCheck
} from "lucide-react";
import { OperatorStatus } from "@/components/layout/Sidebar";

export type CallOutcome = "call_later" | "schedule" | "fail" | "order";

interface CallStatusBarProps {
  status: OperatorStatus;
  isCallActive: boolean;
  isDialing: boolean;
  activeLeadName?: string;
  activeLeadPhone?: string;
  onToggleCall: () => void;
  onSimulateIncoming: () => void;
  onStatusChange: (newStatus: OperatorStatus) => void;
  onCallOutcome: (outcome: CallOutcome) => void;
}

export function CallStatusBar({
  status,
  isCallActive,
  isDialing,
  activeLeadName,
  activeLeadPhone,
  onToggleCall,
  onSimulateIncoming,
  onStatusChange,
  onCallOutcome,
}: CallStatusBarProps) {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive && !isOnHold) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isCallActive) {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive, isOnHold]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (s: OperatorStatus) => {
    switch (s) {
      case "ready":
        return "bg-emerald-500 text-emerald-400";
      case "in_call":
        return "bg-rose-500 text-rose-400";
      case "break":
        return "bg-amber-500 text-amber-400";
    }
  };

  return (
    <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
      
      {/* Left: Active Lead & Primary Action */}
      <div className="flex items-center gap-5">
        
        {/* Status Dropdown */}
        <div className="relative group">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-200">
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status).split(" ")[0]}`} />
            <span className="capitalize">
              {status === "ready" ? "Ready for Calls" : status === "in_call" ? "In Call" : "On Break"}
            </span>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value as OperatorStatus)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="ready">Ready for Calls</option>
              <option value="in_call">In Call</option>
              <option value="break">On Break</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </div>
        </div>

        {/* Lead Info Banner & Dialing State */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-sm">
            {activeLeadName ? activeLeadName.charAt(0) : "L"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100">
                {activeLeadName || "Select a Lead"}
              </span>
              {activeLeadPhone && (
                <span className="text-xs font-mono text-zinc-400">
                  ({activeLeadPhone})
                </span>
              )}
            </div>

            {/* Dialing State */}
            {isDialing && (
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-medium mt-0.5 animate-pulse font-mono">
                <Radio className="w-3.5 h-3.5 animate-spin" />
                <span>Vytáčím klienta...</span>
              </div>
            )}

            {/* Active Call Live Banner & Audio Waveform Visualizer */}
            {isCallActive && !isDialing && (
              <div className="flex items-center gap-3 text-zinc-300 text-xs font-medium mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span>WebRTC Live • </span>
                <span className="font-mono text-zinc-100">{formatTimer(seconds)}</span>

                {/* Live Micro-Waveform Bars */}
                <div className="flex items-center gap-0.5 h-3.5 pl-2 border-l border-zinc-800">
                  <div className="w-1 bg-emerald-500 rounded-full animate-bounce h-2" style={{ animationDelay: "0ms" }} />
                  <div className="w-1 bg-emerald-400 rounded-full animate-bounce h-3.5" style={{ animationDelay: "150ms" }} />
                  <div className="w-1 bg-emerald-500 rounded-full animate-bounce h-1.5" style={{ animationDelay: "300ms" }} />
                  <div className="w-1 bg-emerald-400 rounded-full animate-bounce h-3" style={{ animationDelay: "450ms" }} />
                </div>
              </div>
            )}

            {!isCallActive && !isDialing && (
              <span className="text-[11px] text-zinc-400 block">
                Připraven k vytočení hovoru
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions & Outcome Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Main CALL / END CALL CTA */}
        <button
          onClick={onToggleCall}
          disabled={isDialing}
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
            isCallActive
              ? "bg-rose-900/80 border border-rose-800 text-rose-100 hover:bg-rose-900"
              : "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
          }`}
        >
          {isCallActive ? (
            <>
              <PhoneOff className="w-4 h-4" />
              <span>Ukončit hovor</span>
            </>
          ) : (
            <>
              <PhoneCall className="w-4 h-4 fill-current" />
              <span>Call Client (Vytočit)</span>
            </>
          )}
        </button>

        {/* Call Controls during live call */}
        {isCallActive && (
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isMuted
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsOnHold(!isOnHold)}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isOnHold
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              title={isOnHold ? "Resume" : "Hold"}
            >
              {isOnHold ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Clear Outcome Buttons (Visible when active or after attempt) */}
        <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
          
          {/* 1. Call Later */}
          <button
            onClick={() => onCallOutcome("call_later")}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors flex items-center gap-1.5"
            title="Zákazník nezvedá telefon"
          >
            <PhoneMissed className="w-3.5 h-3.5 text-zinc-400" />
            <span>Call Later</span>
          </button>

          {/* 2. Schedule Callback */}
          <button
            onClick={() => onCallOutcome("schedule")}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors flex items-center gap-1.5"
            title="Zákazník nemá čas - naplánovat hovor"
          >
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>Callback</span>
          </button>

          {/* 3. Fail */}
          <button
            onClick={() => onCallOutcome("fail")}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors flex items-center gap-1.5"
            title="Zákazník odmítnul nabídku"
          >
            <XCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Fail</span>
          </button>

          {/* 4. Complete / Order */}
          <button
            onClick={() => onCallOutcome("order")}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 hover:border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Vytvořit úspěšnou objednávku"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-zinc-300" />
            <span>Success / Order</span>
          </button>
        </div>

        {/* Simulate Incoming Call Shortcut */}
        {!isCallActive && !isDialing && (
          <button
            onClick={onSimulateIncoming}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Simulovat příchozí hovor"
          >
            <PhoneIncoming className="w-4 h-4" />
          </button>
        )}

      </div>

    </div>
  );
}
