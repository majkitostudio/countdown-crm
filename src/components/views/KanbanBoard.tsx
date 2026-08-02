"use client";

import React from "react";
import { Sparkles, PhoneCall, MoreHorizontal, DollarSign, ChevronRight, ChevronLeft } from "lucide-react";
import { Lead, updateLead } from "@/lib/leads";
import { formatCurrency } from "@/lib/utils";

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStartCall: (lead: Lead) => void;
  onLeadUpdated: () => void;
}

const STAGES: { id: Lead["status"]; title: string; color: string }[] = [
  { id: "new", title: "New Leads", color: "border-blue-500/30 text-blue-400" },
  { id: "contacted", title: "Contacted", color: "border-amber-500/30 text-amber-400" },
  { id: "qualified", title: "Qualified", color: "border-emerald-500/30 text-emerald-400" },
  { id: "customer", title: "Won Customer", color: "border-cyan-500/30 text-cyan-400" },
  { id: "unresponsive", title: "Lost / Unresponsive", color: "border-rose-500/30 text-rose-400" },
];

export function KanbanBoard({
  leads,
  onSelectLead,
  onStartCall,
  onLeadUpdated,
}: KanbanBoardProps) {

  const handleMoveStage = async (lead: Lead, direction: "next" | "prev") => {
    const stageIds: Lead["status"][] = ["new", "contacted", "qualified", "customer", "unresponsive"];
    const currentIndex = stageIds.indexOf(lead.status);
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < stageIds.length) {
      await updateLead(lead.id, { status: stageIds[nextIndex] });
      onLeadUpdated();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[640px] items-start">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.status === stage.id);
        const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 750), 0);
        const avgScore = stageLeads.length > 0
          ? Math.round(stageLeads.reduce((sum, l) => sum + l.ai_score, 0) / stageLeads.length)
          : 0;

        return (
          <div
            key={stage.id}
            className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex flex-col space-y-4 shadow-sm"
          >
            {/* Column Header & Aggregation Metrics */}
            <div className="border-b border-zinc-800/80 pb-3 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${stage.color.split(" ")[1]}`}>
                  {stage.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-950 text-zinc-400 border border-zinc-800">
                  {stageLeads.length}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1">
                <span>Sum: {formatCurrency(stageValue)}</span>
                {avgScore > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Sparkles className="w-3 h-3" />
                    {avgScore}
                  </span>
                )}
              </div>
            </div>

            {/* Lead Cards List */}
            <div className="space-y-3 flex-1 min-h-[400px]">
              {stageLeads.length === 0 ? (
                <div className="text-center py-8 text-[11px] text-zinc-600 border border-dashed border-zinc-800/60 rounded-xl">
                  No leads in this stage
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3 group shadow-xs"
                  >
                    {/* Card Top: Name & AI Score */}
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => onSelectLead(lead)}
                        className="text-left font-semibold text-xs text-zinc-100 hover:text-emerald-400 transition-colors line-clamp-1"
                      >
                        {lead.full_name}
                      </button>

                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-800/50 text-[10px] font-bold text-amber-300">
                        <Sparkles className="w-2.5 h-2.5" />
                        {lead.ai_score}
                      </div>
                    </div>

                    {/* Company & Contact Info */}
                    <div className="text-[11px] text-zinc-400 space-y-0.5 font-sans">
                      <div className="truncate text-zinc-300 font-medium">{lead.company || "Independent"}</div>
                      <div className="font-mono text-zinc-500 text-[10px]">{lead.phone}</div>
                    </div>

                    {/* Value Badge */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <span className="text-xs font-semibold font-mono text-zinc-200">
                        {formatCurrency(lead.value || 750)}
                      </span>

                      {/* Quick Call Action */}
                      <button
                        onClick={() => onStartCall(lead)}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-emerald-950 text-zinc-400 hover:text-emerald-400 border border-zinc-800 transition-colors"
                        title="Vytočit hovor"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Stage Move Controls */}
                    <div className="flex items-center justify-between pt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleMoveStage(lead, "prev")}
                        disabled={stage.id === "new"}
                        className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                        title="Move to previous stage"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[10px] text-zinc-600 font-mono uppercase">Posunout</span>

                      <button
                        onClick={() => handleMoveStage(lead, "next")}
                        disabled={stage.id === "unresponsive"}
                        className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                        title="Move to next stage"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
