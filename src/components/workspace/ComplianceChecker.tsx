"use client";

import React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { ComplianceViolation } from "@/lib/compliance";

interface ComplianceCheckerProps {
  violations: ComplianceViolation[];
}

export function ComplianceChecker({ violations }: ComplianceCheckerProps) {
  if (violations.length === 0) {
    return (
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between text-xs text-zinc-300">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />
          <span>• ZÁKONNÝ HLÍDAČ: Hovor probíhá v souladu s právními normami (GDPR & spotřebitelské právo).</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          100% Compliance
        </span>
      </div>
    );
  }

  return (
    <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 space-y-2 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>• ZÁKONNÝ HLÍDAČ: Detekována porušení předpisů ({violations.length})</span>
        </div>
        <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
          POZOR
        </span>
      </div>

      <div className="space-y-2 pt-1">
        {violations.map((v, i) => (
          <div
            key={i}
            className="p-2.5 bg-zinc-950/80 border border-rose-800/60 rounded-lg text-xs space-y-1"
          >
            <div className="flex items-center justify-between font-semibold text-rose-300">
              <span>⚠️ {v.rule.title}</span>
              <span className="text-[10px] text-zinc-500 font-mono">{v.timestamp}</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">{v.rule.explanation}</p>
            <p className="text-[11px] text-amber-300 font-medium">
              💡 Doporučená oprava: {v.rule.correctionSuggestion}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
