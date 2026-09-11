"use client";

import React, { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

export function OperatorPresenceBadge() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={() => setIsOpen((open) => !open)}
        title="Operator presence"
      >
        <Users className="w-3.5 h-3.5 text-zinc-500" />
        <span className="hidden lg:inline text-zinc-200 font-mono">Presence unavailable</span>
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64">
        <Surface variant="overlay" className="w-full">
          <div className="space-y-2 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" /> Active operators
            </span>
            <StatusBadge tone="neutral">Unavailable</StatusBadge>
          </div>
          <p className="text-xs text-zinc-500">
            No persisted presence or telephony stream is available in this pilot.
          </p>
          </div>
        </Surface>
        </div>
      )}
    </div>
  );
}
