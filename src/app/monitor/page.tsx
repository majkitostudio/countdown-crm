"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  PhoneCall,
  User,
  Clock,
  ShieldAlert,
  Volume2,
  TrendingUp,
  Radio,
  Sparkles,
  CheckCircle2,
  Coffee,
  X,
  Play,
  Pause
} from "lucide-react";
import { LiveOperatorState, getLiveOperators } from "@/lib/monitor";

export default function TeamMonitorPage() {
  const [operators, setOperators] = useState<LiveOperatorState[]>([]);
  const [activeAuditOperator, setActiveAuditOperator] = useState<LiveOperatorState | null>(null);
  const [isAuditingAudio, setIsAuditingAudio] = useState(false);

  useEffect(() => {
    async function loadOperators() {
      const data = await getLiveOperators();
      setOperators(data);
    }
    loadOperators();

    // Increment duration timer every second for active calls
    const interval = setInterval(() => {
      setOperators((prev) =>
        prev.map((op) => {
          if (op.status === "in_call") {
            return { ...op, currentCallDuration: op.currentCallDuration + 1 };
          }
          return op;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const getStatusBadge = (status: LiveOperatorState["status"]) => {
    switch (status) {
      case "in_call":
        return {
          label: "IN CALL",
          color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          dotColor: "bg-rose-500 animate-pulse",
        };
      case "ready":
        return {
          label: "READY FOR CALLS",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          dotColor: "bg-emerald-500",
        };
      case "break":
        return {
          label: "ON BREAK",
          color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          dotColor: "bg-amber-500",
        };
      default:
        return {
          label: "WRAP UP",
          color: "bg-zinc-800 text-zinc-400 border-zinc-700",
          dotColor: "bg-zinc-500",
        };
    }
  };

  const activeCallsCount = operators.filter((op) => op.status === "in_call").length;
  const readyOperatorsCount = operators.filter((op) => op.status === "ready").length;

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
            Live Team Operator Monitor
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time supervisor dashboard tracking active phone calls, AI detected objections, and operator status
          </p>
        </div>

        {/* Live Status Summary Badges */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <div className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{activeCallsCount} Active Calls</span>
          </div>

          <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{readyOperatorsCount} Ready</span>
          </div>
        </div>
      </div>

      {/* Live Operator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {operators.map((op) => {
          const badge = getStatusBadge(op.status);

          return (
            <div
              key={op.id}
              className={`bg-zinc-900/90 border rounded-2xl p-5 shadow-xl space-y-4 transition-all ${
                op.status === "in_call"
                  ? "border-rose-500/40 glow-emerald"
                  : "border-zinc-800/80"
              }`}
            >
              {/* Operator Profile & Status */}
              <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200">
                    {op.agentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">{op.agentName}</h3>
                    <p className="text-[11px] text-zinc-400">{op.role}</p>
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${badge.color}`}>
                  <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
                  <span>{badge.label}</span>
                </div>
              </div>

              {/* Active Call Details (If in call) */}
              {op.status === "in_call" ? (
                <div className="space-y-3">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-500" /> Customer:
                      </span>
                      <span className="font-bold text-zinc-100">{op.customerName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" /> Duration:
                      </span>
                      <span className="font-mono font-bold text-cyan-400">
                        {formatDuration(op.currentCallDuration)}
                      </span>
                    </div>
                  </div>

                  {/* AI Objection Banner */}
                  {op.detectedObjection && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>LIVE OBJECTION DETECTED</span>
                      </div>
                      <p className="text-xs text-amber-200/90 leading-tight">
                        &ldquo;{op.detectedObjection}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Audit Button */}
                  <button
                    onClick={() => {
                      setActiveAuditOperator(op);
                      setIsAuditingAudio(true);
                    }}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>Supervisor Audio Audit (Live Listen)</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-center text-zinc-500 text-xs">
                  {op.status === "ready" ? "Awaiting next incoming call..." : "Operator is currently taking a break."}
                </div>
              )}

              {/* Operator Today's Performance Footer */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Calls Today: <strong>{op.callsCompletedToday}</strong></span>
                <span className="text-emerald-400 font-mono font-bold">Sales: ${op.salesToday.toFixed(2)}</span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Supervisor Audio Audit Modal Simulator */}
      {activeAuditOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">Live Audio Supervisor Audit</h3>
                  <p className="text-[11px] text-zinc-400">Monitoring {activeAuditOperator.agentName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveAuditOperator(null);
                  setIsAuditingAudio(false);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Live Stream Target:</span>
                <span className="font-bold text-zinc-200">{activeAuditOperator.customerName}</span>
              </div>

              {/* Animated Audio Spectrum */}
              <div className="h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 flex items-center gap-1">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-rose-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.max(25, Math.sin(i * 0.7) * 90)}%`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Channel: Supervisor Silent Mode</span>
                <span className="text-emerald-400 font-bold">100% Encrypted Stream</span>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveAuditOperator(null);
                setIsAuditingAudio(false);
              }}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors"
            >
              Close Audit Session
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
