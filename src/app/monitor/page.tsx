"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Clock,
  ShieldAlert,
  Volume2,
  Radio,
  X,
} from "lucide-react";
import { LiveOperatorState, getLiveOperators } from "@/lib/monitor";
import { PageHeader } from "@/components/layout/PageHeader";

export default function TeamMonitorPage() {
  const [operators, setOperators] = useState<LiveOperatorState[]>([]);
  const [activeAuditOperator, setActiveAuditOperator] = useState<LiveOperatorState | null>(null);

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
          dotColor: "bg-rose-500 animate-pulse",
        };
      case "ready":
        return {
          label: "READY FOR CALLS",
          dotColor: "bg-emerald-500",
        };
      case "break":
        return {
          label: "ON BREAK",
          dotColor: "bg-amber-500",
        };
      default:
        return {
          label: "WRAP UP",
          dotColor: "bg-zinc-500",
        };
    }
  };

  const activeCallsCount = operators.filter((op) => op.status === "in_call").length;
  const readyOperatorsCount = operators.filter((op) => op.status === "ready").length;

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      <PageHeader
        icon={Radio}
        title="Live Team Operator Monitor"
        badge={{ label: "Unavailable in pilot", tone: "unavailable" }}
        description="Real-time supervisor data is unavailable until presence and telephony integrations are connected."
        actions={
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <div className="px-3.5 py-2 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{activeCallsCount} Active Calls</span>
          </div>

          <div className="px-3.5 py-2 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{readyOperatorsCount} Ready</span>
          </div>
          </div>
        }
      />

      {/* Live Operator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {operators.length === 0 ? (
          <div className="md:col-span-2 p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center">
            <p className="text-sm font-medium text-zinc-300">Live operator data unavailable</p>
            <p className="mt-2 text-xs text-zinc-500">
              This pilot has no persisted presence or telephony stream yet. No operator activity is being fabricated.
            </p>
          </div>
        ) : operators.map((op) => {
          const badge = getStatusBadge(op.status);

          return (
            <div
              key={op.id}
              className={`bg-zinc-900/40 border border-t border-white/5 rounded-2xl p-6 shadow-sm space-y-5 backdrop-blur-md transition-all ${
                op.status === "in_call"
                  ? "border-zinc-700"
                  : "border-zinc-800/80"
              }`}
            >
              {/* Operator Profile & Status */}
              <div className="flex items-start justify-between pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center font-semibold text-zinc-200 text-xs font-mono">
                    {op.agentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-100">{op.agentName}</h3>
                    <p className="text-[11px] text-zinc-400">{op.role}</p>
                  </div>
                </div>

                <div className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                  <span>{badge.label}</span>
                </div>
              </div>

              {/* Active Call Details (If in call) */}
              {op.status === "in_call" ? (
                <div className="space-y-3">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-500" /> Customer:
                      </span>
                      <span className="font-semibold text-zinc-100">{op.customerName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" /> Duration:
                      </span>
                      <span className="font-mono font-semibold text-zinc-100">
                        {formatDuration(op.currentCallDuration)}
                      </span>
                    </div>
                  </div>

                  {/* AI Objection Banner */}
                  {op.detectedObjection && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-zinc-200">
                        <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                        <span>LIVE OBJECTION DETECTED</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-tight">
                        &ldquo;{op.detectedObjection}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Audit Button */}
                  <button
                    onClick={() => {
                      setActiveAuditOperator(op);
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border border-zinc-800 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-zinc-400" />
                    <span>Supervisor Audio Audit (Live Listen)</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-zinc-950/40 border border-zinc-800/60 rounded-lg text-center text-zinc-500 text-xs font-mono">
                  {op.status === "ready" ? "Awaiting next incoming call..." : "Operator is currently taking a break."}
                </div>
              )}

              {/* Operator Today's Performance Footer */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Calls Today: <strong className="font-mono text-zinc-200">{op.callsCompletedToday}</strong></span>
                <span className="text-zinc-100 font-mono font-semibold">Sales: ${op.salesToday.toFixed(2)}</span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Supervisor Audio Audit remains unavailable until a real stream exists. */}
      {activeAuditOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-xs p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-100">Supervisor Audio Audit unavailable</h3>
                  <p className="text-[11px] text-zinc-400">No live stream is connected for {activeAuditOperator.agentName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveAuditOperator(null);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Live Stream Target:</span>
                <span className="font-semibold text-zinc-200">{activeAuditOperator.customerName}</span>
              </div>

              {/* Animated Audio Spectrum */}
              <div className="h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 flex items-center gap-1">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-zinc-300 rounded-full animate-pulse"
                    style={{
                      height: `${Math.max(25, Math.sin(i * 0.7) * 90)}%`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>Channel: Supervisor Silent</span>
                <span className="text-zinc-300">Encrypted Stream</span>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveAuditOperator(null);
              }}
              className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close Audit Session
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
