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
        className="flex h-8 items-center gap-2 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 transition-all cursor-pointer"
        title="Tým operátorů online"
      >
        <div className="flex -space-x-1.5 overflow-hidden">
          {operators.map((op) => (
            <div
              key={op.id}
              className="relative w-5 h-5 rounded-full bg-zinc-800 border border-zinc-950 flex items-center justify-center text-[9px] font-semibold text-zinc-200 shrink-0"
            >
              {op.avatarInitials}
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-950",
                  op.status === "in_call"
                    ? "bg-rose-500"
                    : op.status === "ready"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                )}
              />
            </div>
          ))}
        </div>

        <span className="hidden lg:inline text-zinc-200 font-mono">
          {operators.length} online
        </span>

        {inCallCount > 0 && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {inCallCount} v hovoru
          </span>
        )}

        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {/* Popover list */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-3 space-y-2 z-50 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" /> Aktivní operátoři
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
                  <div className="relative w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-semibold text-zinc-200 text-[10px]">
                    {op.avatarInitials}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-950",
                        op.status === "in_call"
                          ? "bg-rose-500"
                          : op.status === "ready"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-200 text-[11px]">
                      {op.name}
                    </p>
                    {op.currentLead && (
                      <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                        Volá: {op.currentLead}
                      </p>
                    )}
                  </div>
                </div>

                <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      op.status === "in_call"
                        ? "bg-rose-500"
                        : op.status === "ready"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    )}
                  />
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
