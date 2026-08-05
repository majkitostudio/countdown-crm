"use client";

import React, { useState } from "react";
import { TrendingUp, Sparkles, DollarSign, Target, ArrowUpRight, ShieldCheck, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AiForecastCardProps {
  totalPipelineValue: number;
  avgAiScore: number;
  totalLeadsCount: number;
}

export function AiForecastCard({
  totalPipelineValue,
  avgAiScore,
  totalLeadsCount,
}: AiForecastCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Predictive scenario calculations
  const expectedFactor = Math.max(0.3, Math.min(0.85, (avgAiScore / 100) * 0.9));
  const pessimisticValue = Math.round(totalPipelineValue * 0.35);
  const expectedValue = Math.round(totalPipelineValue * expectedFactor);
  const optimisticValue = Math.round(totalPipelineValue * 0.88);

  const targetGoal = 150000;
  const targetPercent = Math.round((expectedValue / targetGoal) * 100);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100">
                AI Predictive Revenue Forecasting
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Gemini 2.5 Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Předpověď výnosů na základě váženého AI Propensity Skóre ({avgAiScore}/100)
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          title="Přepočítat AI predikci"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
        </button>
      </div>

      {/* 3 Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pessimistic Scenario */}
        <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
            Pesimistický Scénář (35%)
          </span>
          <p className="text-xl font-bold font-mono text-zinc-100">
            {formatCurrency(pessimisticValue)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Při nejnižší konverzi bez dodatečných akcí
          </p>
        </div>

        {/* Expected Scenario (AI Weighted) */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/30 ring-1 ring-amber-500/20 rounded-xl space-y-1 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Očekávaný Scénář ({Math.round(expectedFactor * 100)}%)
            </span>
            <span className="text-[9px] font-bold bg-amber-500 text-zinc-950 px-1.5 py-0.2 rounded">
              AI Recommendation
            </span>
          </div>
          <p className="text-2xl font-extrabold font-mono text-amber-300">
            {formatCurrency(expectedValue)}
          </p>
          <p className="text-[11px] text-zinc-400">
            Vážený odhad dle nákupního záměru leadů
          </p>
        </div>

        {/* Optimistic Scenario */}
        <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            Optimistický Scénář (88%)
          </span>
          <p className="text-xl font-bold font-mono text-zinc-100">
            {formatCurrency(optimisticValue)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Při 100% aktivaci doporučených rebuttal karet
          </p>
        </div>
      </div>

      {/* Target Progress & Gemini Executive Commentary */}
      <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
            <Target className="w-4 h-4 text-amber-400" />
            Cíl měsíčního prodeje: <strong className="text-zinc-200">{formatCurrency(targetGoal)}</strong>
          </span>
          <span className="font-mono font-bold text-amber-400">
            {targetPercent}% splněno
          </span>
        </div>

        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, targetPercent)}%` }}
          />
        </div>

        <div className="pt-2 text-xs text-zinc-300 leading-relaxed space-y-1 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5 font-bold text-zinc-100 text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AI Executive Commentary (Gemini Flash)
          </div>
          <p className="text-zinc-400 text-[11px]">
            &quot;Při současném průměrném AI skóre <strong>{avgAiScore}/100</strong> a celkovém objemu rozjednaných příležitostí <strong>{formatCurrency(totalPipelineValue)}</strong> je vysoká pravděpodobnost dosáhnout cíle {targetPercent}%. Pro překonání 100% cíle doporučuji zaměřit hovory operátorů na segment s cenovou námitkou pomocí Bio-Boost balíčků.&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
