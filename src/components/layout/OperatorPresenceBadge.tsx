"use client";

import React, { useState } from "react";
import { Users, PhoneCall, Coffee, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OperatorPresence {
  id: string;
  name: string;
  avatarInitials: string;
  status: "in_call" | "ready" | "break";
  currentLead?: string;
}

const MOCK_ONLINE_OPERATORS: OperatorPresence[] = [
  {
    id: "op-1",
    name: "Alex Vance",
    avatarInitials: "AV",
    status: "in_call",
    currentLead: "Apex Logistics",
  },
  {
    id: "op-2",
    name: "Jan Dvořák (Vy)",
    avatarInitials: "JD",
    status: "ready",
  },
  {
    id: "op-3",
    name: "Eva Svobodová",
    avatarInitials: "ES",
    status: "break",
  },
];

export function OperatorPresenceBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const operators = MOCK_ONLINE_OPERATORS;
  const inCallCount = operators.filter((o) => o.status === "in_call").length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
        title="Tým operátorů online"
      >
        <div className="flex -space-x-1.5 overflow-hidden">
          {operators.map((op) => (
            <div
              key={op.id}
              className={cn(
                "w-5 h-5 rounded-full border border-zinc-950 flex items-center justify-center text-[9px] font-bold shrink-0",
                op.status === "in_call"
                  ? "bg-rose-500 text-zinc-950"
                  : op.status === "ready"
                  ? "bg-emerald-500 text-zinc-950"
                  : "bg-amber-500 text-zinc-950"
              )}
            >
              {op.avatarInitials}
            </div>
          ))}
        </div>

        <span className="hidden lg:inline text-zinc-200">
          {operators.length} operátoři online
        </span>

        {inCallCount > 0 && (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {inCallCount} v hovoru
          </span>
        )}

        <ChevronDown className="w-3 h-3 text-zinc-500" />
      </button>

      {/* Popover list */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-3 space-y-2 z-50 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Aktivní operátoři
            </span>
            <span className="text-[10px] font-mono text-zinc-500">Live</span>
          </div>

          <div className="space-y-1.5">
            {operators.map((op) => (
              <div
                key={op.id}
                className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                      op.status === "in_call"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : op.status === "ready"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    )}
                  >
                    {op.avatarInitials}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-200 text-[11px]">
                      {op.name}
                    </p>
                    {op.currentLead && (
                      <p className="text-[10px] text-rose-400 font-mono truncate max-w-[120px]">
                        Volá: {op.currentLead}
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono",
                    op.status === "in_call"
                      ? "bg-rose-500/10 text-rose-400"
                      : op.status === "ready"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  )}
                >
                  {op.status === "in_call"
                    ? "In Call"
                    : op.status === "ready"
                    ? "Ready"
                    : "Break"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
