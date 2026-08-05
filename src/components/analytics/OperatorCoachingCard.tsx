"use client";

import React from "react";
import { GraduationCap, Award, ShieldCheck, Zap, Sparkles, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentMetric {
  name: string;
  role: string;
  callsCount: number;
  conversionRate: number;
  objectionSuccess: number;
  complianceRating: number;
  coachingTip: string;
}

const AGENT_BENCHMARKS: AgentMetric[] = [
  {
    name: "Alex Vance",
    role: "Senior Tele-Sales Specialist",
    callsCount: 142,
    conversionRate: 28.5,
    objectionSuccess: 92,
    complianceRating: 100,
    coachingTip:
      "Využívejte bundlové slevové argumenty v prvních 2 minutách hovoru pro zkrácení rozhodovacího času.",
  },
  {
    name: "Jan Dvořák",
    role: "Enterprise B2B Account Rep",
    callsCount: 98,
    conversionRate: 22.1,
    objectionSuccess: 84,
    complianceRating: 98,
    coachingTip:
      "U B2B leadů zdůrazněte garanci vrácení peněz do 30 dnů pro snížení vnímaného rizika zakoupení.",
  },
  {
    name: "Eva Svobodová",
    role: "Customer Success & Retention Rep",
    callsCount: 115,
    conversionRate: 19.8,
    objectionSuccess: 76,
    complianceRating: 100,
    coachingTip:
      "Při námitce k jiné značce doporučuji aktivně nabídnout porovnání lipozomálního vstřebávání.",
  },
];

export function OperatorCoachingCard() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">
                AI Operator Benchmarks & Personal Coaching
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                Attio Coaching Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Personalizovaná AI doporučení a tréninkové tipy na základě reálných hovorů
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md text-xs font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          100% Legal Audit Active
        </span>
      </div>

      {/* Agents Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AGENT_BENCHMARKS.map((ag, idx) => (
          <div
            key={idx}
            className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-3 flex flex-col justify-between"
          >
            {/* Agent info & Badge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-xs text-zinc-100">{ag.name}</h3>
                  <p className="text-[10px] text-zinc-500">{ag.role}</p>
                </div>
                <span className="px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded font-mono text-[10px]">
                  {ag.conversionRate}% Conv.
                </span>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-400">
                <div>
                  <span className="block text-zinc-500 font-mono">Hovory</span>
                  <span className="font-semibold text-zinc-200 font-mono">{ag.callsCount}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-mono">Námitky</span>
                  <span className="font-semibold text-zinc-200 font-mono">{ag.objectionSuccess}%</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-mono">Compliance</span>
                  <span className="font-semibold text-zinc-200 font-mono">{ag.complianceRating}%</span>
                </div>
              </div>
            </div>

            {/* AI Personal Coaching Recommendation */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg space-y-1 text-[11px] mt-2">
              <div className="flex items-center gap-1 font-semibold text-zinc-300 text-[10px]">
                <Sparkles className="w-3 h-3 text-zinc-400" />
                <span>AI Coaching Tip:</span>
              </div>
              <p className="text-zinc-300 leading-snug">{ag.coachingTip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
