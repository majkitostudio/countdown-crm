"use client";

import React, { useState } from "react";
import { ChevronDown, Users } from "lucide-react";

export function OperatorPresenceBadge() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 transition-all cursor-pointer"
        title="Operator presence"
      >
        <Users className="w-3.5 h-3.5 text-zinc-500" />
        <span className="hidden lg:inline text-zinc-200 font-mono">Presence unavailable</span>
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-3 space-y-2 z-50">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" /> Active operators
            </span>
            <span className="text-[10px] font-mono text-zinc-500">Unavailable</span>
          </div>
          <p className="text-xs text-zinc-500">
            No persisted presence or telephony stream is available in this pilot.
          </p>
        </div>
      )}
    </div>
  );
}
