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
  Sparkles,
  UserCheck,
  ChevronDown,
  Circle
} from "lucide-react";
import { OperatorStatus } from "@/components/layout/Sidebar";

interface CallStatusBarProps {
  status: OperatorStatus;
  isCallActive: boolean;
  activeLeadName?: string;
  onToggleCall: () => void;
  onStatusChange: (newStatus: OperatorStatus) => void;
}

export function CallStatusBar({
  status,
  isCallActive,
  activeLeadName,
  onToggleCall,
  onStatusChange,
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
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
      
      {/* Left: Operator Status Selector & Call State Badge */}
      <div className="flex items-center gap-4">
        {/* Status Dropdown */}
        <div className="relative group">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200">
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status).split(" ")[0]} animate-pulse`} />
            <span className="capitalize">{status === "ready" ? "Ready for Calls" : status === "in_call" ? "In Call" : "On Break"}</span>
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

        {/* Active Call Banner */}
        {isCallActive ? (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 px-3.5 py-1.5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Call Live with {activeLeadName || "Customer"}
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono font-bold text-xs text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-500/30">
              <Clock className="w-3 h-3 text-rose-400" />
              <span>{formatTimer(seconds)}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-400 flex items-center gap-2 bg-zinc-950/60 px-3 py-1.5 rounded-xl border border-zinc-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Select a lead and press &ldquo;Start Virtual Call&rdquo; to begin AI-copiloted call</span>
          </div>
        )}
      </div>

      {/* Right: Call Control Buttons */}
      <div className="flex items-center gap-2">
        {isCallActive && (
          <>
            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
                isMuted
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Hold Button */}
            <button
              onClick={() => setIsOnHold(!isOnHold)}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
                isOnHold
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              title={isOnHold ? "Resume Call" : "Put Call on Hold"}
            >
              {isOnHold ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>
          </>
        )}

        {/* Start / End Call Main CTA */}
        <button
          onClick={onToggleCall}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
            isCallActive
              ? "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
              : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
          }`}
        >
          {isCallActive ? (
            <>
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </>
          ) : (
            <>
              <PhoneCall className="w-4 h-4 fill-current" />
              <span>Start Virtual Call</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
